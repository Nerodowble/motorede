import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeMaintenance, sortByUrgency, parseIntervalKm, MAINTENANCE_CATEGORIES,
  describeRemaining, describeMeasuredHint,
} from '../../packages/shared/src/domain/maintenance.ts';
import { AJUDA_MOTO } from '../../packages/shared/src/domain/motoAjuda.ts';
import type { MaintenanceRecord } from '../../packages/shared/src/types.ts';

let seq = 0;
const troca = (category: MaintenanceRecord['category'], km: number, date = '2026-01-01T12:00:00Z'): MaintenanceRecord => ({
  id: `r-${seq++}`, motorcycleId: 'm', date, km, category, title: '', description: '',
  workshopName: '', cost: 0, hasAttachment: false,
});
const item = (itens: ReturnType<typeof summarizeMaintenance>, c: MaintenanceRecord['category']) =>
  itens.find(i => i.category === c)!;

test('cenário do piloto: moto com 10.000, trocou o óleo hoje, troca a cada 1.000', () => {
  const registros = [troca('engine_oil', 10000)];
  const moto = (currentKm: number) => ({ currentKm, customIntervals: { engine_oil: 1000 } });
  const esperado: [number, number, number, string][] = [
    // odômetro, rodou, faltam, situação
    [10000, 0, 1000, 'ok'],
    [10500, 500, 500, 'ok'],
    [10849, 849, 151, 'ok'],
    [10850, 850, 150, 'proximo'], // 15% de 1.000
    [10900, 900, 100, 'proximo'],
    [11000, 1000, 0, 'hora-de-trocar'],
    [11200, 1200, -200, 'vencido'],
  ];
  for (const [km, rodou, faltam, status] of esperado) {
    const oleo = item(summarizeMaintenance(registros, moto(km)), 'engine_oil');
    assert.equal(oleo.nextChangeKm, 11000, `próxima troca com odômetro ${km}`);
    assert.equal(oleo.kmSinceLast, rodou, `rodou com odômetro ${km}`);
    assert.equal(oleo.kmRemaining, faltam, `faltam com odômetro ${km}`);
    assert.equal(oleo.status, status, `situação com odômetro ${km}`);
  }
});

test('nenhum item tem intervalo padrão: sem informar, só mostra quanto rodou', () => {
  const registros = MAINTENANCE_CATEGORIES.map(c => troca(c, 10000));
  for (const i of summarizeMaintenance(registros, { currentKm: 10900 })) {
    assert.equal(i.status, 'sem-intervalo', i.label);
    assert.equal(i.kmSinceLast, 900, i.label);
    assert.equal(i.intervalKm, undefined, i.label);
    assert.equal(i.nextChangeKm, undefined, i.label);
    assert.equal(i.kmRemaining, undefined, i.label);
  }
});

test('pneu e freio usam o intervalo informado pelo piloto, cada um com sua troca', () => {
  const registros = [troca('tires', 8000), troca('brakes', 10000)];
  const itens = summarizeMaintenance(registros, { currentKm: 12000, customIntervals: { tires: 10000, brakes: 5000 } });
  assert.equal(item(itens, 'tires').nextChangeKm, 18000);
  assert.equal(item(itens, 'tires').kmRemaining, 6000);
  assert.equal(item(itens, 'brakes').nextChangeKm, 15000);
  assert.equal(item(itens, 'brakes').kmRemaining, 3000);
});

test('a média medida nunca substitui o intervalo: é só dica', () => {
  const registros = [troca('engine_oil', 10000), troca('engine_oil', 11200), troca('engine_oil', 12400)];
  const semInformar = item(summarizeMaintenance(registros, { currentKm: 12500 }), 'engine_oil');
  assert.equal(semInformar.status, 'sem-intervalo');
  assert.equal(semInformar.measuredIntervalKm, 1200);
  assert.equal(semInformar.kmRemaining, undefined);

  const informado = item(summarizeMaintenance(registros, { currentKm: 12500, customIntervals: { engine_oil: 1000 } }), 'engine_oil');
  assert.equal(informado.intervalKm, 1000);
  assert.equal(informado.nextChangeKm, 13400);
  assert.equal(informado.measuredIntervalKm, 1200);
});

test('a troca mais recente é a de maior km, não a última digitada', () => {
  const registros = [troca('engine_oil', 12000), troca('engine_oil', 11000)];
  const oleo = item(summarizeMaintenance(registros, { currentKm: 12300, customIntervals: { engine_oil: 1000 } }), 'engine_oil');
  assert.equal(oleo.last?.km, 12000);
  assert.equal(oleo.nextChangeKm, 13000);
  assert.equal(oleo.kmRemaining, 700);
});

test('intervalo informado aparece mesmo antes da primeira troca', () => {
  const oleo = item(summarizeMaintenance([], { currentKm: 500, customIntervals: { engine_oil: 1500 } }), 'engine_oil');
  assert.equal(oleo.status, 'sem-registro');
  assert.equal(oleo.intervalKm, 1500);
  assert.equal(oleo.nextChangeKm, undefined);
});

test('odômetro atrás da troca não gera km rodado negativo', () => {
  const oleo = item(summarizeMaintenance([troca('engine_oil', 10000)], { currentKm: 9000, customIntervals: { engine_oil: 1000 } }), 'engine_oil');
  assert.equal(oleo.kmSinceLast, 0);
  assert.equal(oleo.kmRemaining, 1000);
});

test('urgência: vencido, hora de trocar, se aproximando, sem intervalo, em dia, sem registro', () => {
  const registros = [
    troca('engine_oil', 10000), troca('tires', 10000), troca('brakes', 10000),
    troca('battery', 10000), troca('transmission_chain', 19500),
  ];
  const itens = summarizeMaintenance(registros, {
    currentKm: 20000,
    customIntervals: { engine_oil: 1000, tires: 10000, brakes: 11000, transmission_chain: 20000 },
  });
  assert.deepEqual(sortByUrgency(itens).map(i => i.status), [
    'vencido', 'hora-de-trocar', 'proximo', 'sem-intervalo', 'ok', 'sem-registro',
  ]);
});

test('leitura do intervalo digitado aceita ponto de milhar e recusa valores absurdos', () => {
  assert.equal(parseIntervalKm('1.000'), 1000);
  assert.equal(parseIntervalKm(' 1500 km'), 1500);
  assert.equal(parseIntervalKm(''), null);
  assert.equal(parseIntervalKm('50'), null);
  assert.equal(parseIntervalKm('1000000'), null);
});

test('todo texto de ajuda tem título e explicação', () => {
  for (const ajuda of Object.values(AJUDA_MOTO)) {
    assert.ok(ajuda.titulo.length > 0);
    assert.ok(ajuda.paragrafos.length > 0 && ajuda.paragrafos.every(p => p.length > 0));
  }
});

test('frases de quanto falta e da média', () => {
  assert.equal(describeRemaining(1000), 'faltam 1.000 km');
  assert.equal(describeRemaining(0), 'chegou a hora de trocar');
  assert.equal(describeRemaining(-200), 'passou 200 km');
  const registros = [troca('engine_oil', 10000), troca('engine_oil', 11200), troca('engine_oil', 12400)];
  const comMedia = item(summarizeMaintenance(registros, { currentKm: 12500, customIntervals: { engine_oil: 1000 } }), 'engine_oil');
  assert.equal(describeMeasuredHint(comMedia), 'Nas suas últimas trocas, a média foi de 1.200 km.');
  const igual = item(summarizeMaintenance(registros, { currentKm: 12500, customIntervals: { engine_oil: 1200 } }), 'engine_oil');
  assert.equal(describeMeasuredHint(igual), null);
});
