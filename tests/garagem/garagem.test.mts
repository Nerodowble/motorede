import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GARAGEM_VAZIA, adotarRegistrosOrfaos, atualizarAtiva, escolherMoto, garagemDeLegado,
  motoAtiva, registrosDaMoto, removerDaGaragem, salvarNaGaragem,
} from '../../packages/shared/src/domain/garagem.ts';
import type { MaintenanceRecord, Motorcycle } from '../../packages/shared/src/types.ts';

const moto = (id: string, model = id): Motorcycle => ({
  id, brand: 'Honda', model, year: 2022, licensePlate: '', currentKm: 1000,
  avgKmPerMonth: 0, lastKmUpdate: '2026-01-01T00:00:00.000Z',
});
const reg = (id: string, motorcycleId: string): MaintenanceRecord => ({
  id, motorcycleId, date: '2026-01-01', km: 500, category: 'oil', title: 'Óleo',
  description: '', workshopName: '', cost: 0, hasAttachment: false,
} as MaintenanceRecord);

test('legado: a moto antiga vira a garagem com ela ativa', () => {
  assert.deepEqual(garagemDeLegado(null), GARAGEM_VAZIA);
  const g = garagemDeLegado(moto('pcx'));
  assert.equal(g.ativaId, 'pcx');
  assert.equal(motoAtiva(g)?.id, 'pcx');
});

test('moto nova entra e vira a ativa; existente só é atualizada', () => {
  let g = garagemDeLegado(moto('pcx'));
  g = salvarNaGaragem(g, moto('cb500'));
  assert.equal(g.motos.length, 2);
  assert.equal(g.ativaId, 'cb500');
  g = salvarNaGaragem(g, { ...moto('pcx'), currentKm: 9999 });
  assert.equal(g.motos.length, 2);
  assert.equal(g.ativaId, 'cb500');
  assert.equal(g.motos.find((m) => m.id === 'pcx')?.currentKm, 9999);
});

test('atualizarAtiva mexe só na ativa', () => {
  let g = salvarNaGaragem(garagemDeLegado(moto('pcx')), moto('cb500'));
  g = atualizarAtiva(g, (m) => ({ ...m, currentKm: 2000 }));
  assert.equal(g.motos.find((m) => m.id === 'cb500')?.currentKm, 2000);
  assert.equal(g.motos.find((m) => m.id === 'pcx')?.currentKm, 1000);
  assert.equal(atualizarAtiva(GARAGEM_VAZIA, (m) => m), GARAGEM_VAZIA);
});

test('escolher troca a ativa; id desconhecido não muda nada', () => {
  const g = salvarNaGaragem(garagemDeLegado(moto('pcx')), moto('cb500'));
  assert.equal(escolherMoto(g, 'pcx').ativaId, 'pcx');
  assert.equal(escolherMoto(g, 'nada'), g);
});

test('remover a ativa passa a vez para a que sobrou; a última esvazia', () => {
  let g = salvarNaGaragem(garagemDeLegado(moto('pcx')), moto('cb500'));
  g = removerDaGaragem(g, 'cb500');
  assert.equal(g.ativaId, 'pcx');
  assert.equal(removerDaGaragem(g, 'pcx').ativaId, null);
  // remover outra que não a ativa mantém a ativa
  const h = removerDaGaragem(salvarNaGaragem(garagemDeLegado(moto('pcx')), moto('cb500')), 'pcx');
  assert.equal(h.ativaId, 'cb500');
});

test('histórico separado por moto', () => {
  const rs = [reg('1', 'pcx'), reg('2', 'cb500'), reg('3', 'pcx')];
  assert.deepEqual(registrosDaMoto(rs, 'pcx').map((r) => r.id), ['1', '3']);
});

test('registros órfãos ficam com a moto só quando há uma moto', () => {
  const rs = [reg('1', 'moto-antiga'), reg('2', 'pcx')];
  const uma = adotarRegistrosOrfaos(rs, garagemDeLegado(moto('pcx')));
  assert.ok(uma.every((r) => r.motorcycleId === 'pcx'));
  const duas = salvarNaGaragem(garagemDeLegado(moto('pcx')), moto('cb500'));
  assert.equal(adotarRegistrosOrfaos(rs, duas), rs);
});
