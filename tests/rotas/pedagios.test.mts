import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { TabelaPedagios } from '../../packages/shared/src/domain/pedagios.ts';

const tabela: TabelaPedagios = JSON.parse(readFileSync('apps/web/public/dados/pedagios-sp.json', 'utf-8'));
const PEDAGIOS_SP = tabela.pracas;

test('cabeçalho confere com o conteúdo', () => {
  assert.equal(tabela.uf, 'SP');
  assert.equal(tabela.total, PEDAGIOS_SP.length);
  assert.match(tabela.consultadoAte, /^\d{4}-\d{2}-\d{2}$/);
});

test('cada praça tem id único', () => {
  const ids = new Set(PEDAGIOS_SP.map((p) => p.id));
  assert.equal(ids.size, PEDAGIOS_SP.length);
});

test('valor de moto só existe com fonte e nunca passa o do carro', () => {
  for (const p of PEDAGIOS_SP) {
    if (p.situacaoMoto === 'paga') {
      assert.ok(p.motoReais && p.motoReais > 0, p.id);
      assert.ok(p.fonte, `${p.id} sem fonte`);
      if (p.carroReais) assert.ok(p.motoReais <= p.carroReais, `${p.id}: moto acima do carro`);
    }
    if (p.situacaoMoto === 'isenta') assert.equal(p.motoReais, 0, p.id);
    // "A confirmar" nunca carrega número: nem o zero da isenção provável.
    if (p.situacaoMoto === 'a-confirmar') assert.equal(p.motoReais, null, p.id);
  }
});

test('coordenadas, quando existem, caem dentro de São Paulo', () => {
  for (const p of PEDAGIOS_SP) {
    if (p.lat == null || p.lng == null) continue;
    assert.ok(p.lat > -25.4 && p.lat < -19.7 && p.lng > -53.2 && p.lng < -44.1, `${p.id}: ${p.lat}, ${p.lng}`);
  }
});

test('nenhum nome com texto corrompido de codificação', () => {
  for (const p of PEDAGIOS_SP) assert.doesNotMatch(p.nome + p.concessionaria, /Ã[\u0080-\u00BF]|Â|\uFFFD/, p.id);
});
