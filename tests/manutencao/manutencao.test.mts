import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeMaintenance, sortByUrgency, parseIntervalKm, describeIntervalSource,
} from '../../packages/shared/src/domain/maintenance.ts';
import { AJUDA_MOTO } from '../../packages/shared/src/domain/motoAjuda.ts';
import type { MaintenanceRecord } from '../../packages/shared/src/types.ts';

let seq = 0;
const troca = (category: MaintenanceRecord['category'], km: number, date = '2026-01-01T12:00:00Z'): MaintenanceRecord => ({
  id: `r-${seq++}`, motorcycleId: 'm', date, km, category, title: '', description: '',
  workshopName: '', cost: 0, hasAttachment: false,
});
const oleo = (itens: ReturnType<typeof summarizeMaintenance>) => itens.find(i => i.category === 'engine_oil')!;

test('óleo sem intervalo informado não usa mais 5.000 km: mostra só o que rodou', () => {
  const item = oleo(summarizeMaintenance([troca('engine_oil', 10000)], { currentKm: 10900 }));
  assert.equal(item.status, 'sem-intervalo');
  assert.equal(item.kmSinceLast, 900);
  assert.equal(item.intervalKm, undefined);
  assert.equal(item.kmRemaining, undefined);
});

test('óleo a cada 1.000 km: rodou 900, faltam 100 e está se aproximando', () => {
  const registros = [troca('engine_oil', 10000)];
  const moto = (currentKm: number) => ({ currentKm, customIntervals: { engine_oil: 1000 } });

  const aos900 = oleo(summarizeMaintenance(registros, moto(10900)));
  assert.equal(aos900.kmSinceLast, 900);
  assert.equal(aos900.kmRemaining, 100);
  assert.equal(aos900.status, 'proximo');
  assert.equal(aos900.intervalSource, 'declarado');

  assert.equal(oleo(summarizeMaintenance(registros, moto(10500))).status, 'ok');
  assert.equal(oleo(summarizeMaintenance(registros, moto(10850))).status, 'proximo'); // 15% de 1.000
  assert.equal(oleo(summarizeMaintenance(registros, moto(10849))).status, 'ok');

  const vencido = oleo(summarizeMaintenance(registros, moto(11050)));
  assert.equal(vencido.status, 'vencido');
  assert.equal(vencido.kmRemaining, -50);

  assert.equal(oleo(summarizeMaintenance(registros, moto(11000))).status, 'vencido');
});

test('a troca mais recente é a de maior km, não a última digitada', () => {
  const registros = [troca('engine_oil', 12000), troca('engine_oil', 11000)];
  const item = oleo(summarizeMaintenance(registros, { currentKm: 12300, customIntervals: { engine_oil: 1000 } }));
  assert.equal(item.last?.km, 12000);
  assert.equal(item.kmRemaining, 700);
});

test('intervalo informado vence o medido, mas o medido continua disponível', () => {
  const registros = [troca('engine_oil', 10000), troca('engine_oil', 11200), troca('engine_oil', 12400)];
  const item = oleo(summarizeMaintenance(registros, { currentKm: 12500, customIntervals: { engine_oil: 1000 } }));
  assert.equal(item.intervalKm, 1000);
  assert.equal(item.intervalSource, 'declarado');
  assert.equal(item.measuredIntervalKm, 1200);
});

test('sem intervalo informado, 3 trocas viram intervalo medido', () => {
  const registros = [troca('engine_oil', 10000), troca('engine_oil', 11000), troca('engine_oil', 12200)];
  const item = oleo(summarizeMaintenance(registros, { currentKm: 12500 }));
  assert.equal(item.intervalKm, 1100);
  assert.equal(item.intervalSource, 'medido');
  assert.equal(item.kmRemaining, 800);
});

test('outros itens mantêm o padrão típico quando nada foi informado', () => {
  const itens = summarizeMaintenance([troca('transmission_chain', 5000)], { currentKm: 6000 });
  const kit = itens.find(i => i.category === 'transmission_chain')!;
  assert.equal(kit.intervalSource, 'padrao');
  assert.equal(kit.intervalKm, 25000);
});

test('intervalo informado aparece mesmo antes da primeira troca', () => {
  const item = oleo(summarizeMaintenance([], { currentKm: 500, customIntervals: { engine_oil: 1500 } }));
  assert.equal(item.status, 'sem-registro');
  assert.equal(item.intervalKm, 1500);
});

test('odômetro atrás da troca não gera km rodado negativo', () => {
  const item = oleo(summarizeMaintenance([troca('engine_oil', 10000)], { currentKm: 9000, customIntervals: { engine_oil: 1000 } }));
  assert.equal(item.kmSinceLast, 0);
  assert.equal(item.kmRemaining, 1000);
});

test('urgência: vencido, sem intervalo, em dia, sem registro', () => {
  const registros = [troca('engine_oil', 10000), troca('tires', 0), troca('brakes', 15000)];
  const itens = summarizeMaintenance(registros, { currentKm: 20000, customIntervals: { brakes: 12000 } });
  const ordem = sortByUrgency(itens).map(i => i.status);
  assert.deepEqual(ordem.slice(0, 4), ['vencido', 'sem-intervalo', 'ok', 'sem-registro']);
});

test('leitura do intervalo digitado aceita ponto de milhar e recusa valores absurdos', () => {
  assert.equal(parseIntervalKm('1.000'), 1000);
  assert.equal(parseIntervalKm(' 1500 km'), 1500);
  assert.equal(parseIntervalKm(''), null);
  assert.equal(parseIntervalKm('50'), null);
  assert.equal(parseIntervalKm('1000000'), null);
});

test('texto da origem do intervalo é claro para o piloto', () => {
  assert.equal(describeIntervalSource('declarado', 1000, 1), 'Você troca a cada 1.000 km');
});

test('todo texto de ajuda tem título e explicação', () => {
  for (const ajuda of Object.values(AJUDA_MOTO)) {
    assert.ok(ajuda.titulo.length > 0);
    assert.ok(ajuda.paragrafos.length > 0 && ajuda.paragrafos.every(p => p.length > 0));
  }
});
