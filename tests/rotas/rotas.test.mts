import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buscarRotas, estimarCustoRota, lerNumeroRota, linksNavegacaoRota, fonteRotaSegura,
  type RotaCatalogo,
} from '../../packages/shared/src/domain/rotas.ts';
import { CATALOGO_ROTAS } from '../../packages/shared/src/data/catalogoRotas.ts';

const rota: RotaCatalogo = {
  id: 'rota-teste', nome: 'São João', regiao: 'SP, Brasil',
  inicio: { cidade: 'Início', lat: -23, lng: -46 }, fim: { cidade: 'Fim', lat: -24, lng: -47 },
  distanciaKm: 100, pavimento: 'asfalto', curvas: 'alto', trechoSemPostoKm: 60,
  pedagioIda: 12, pontosApoio: [], observacoes: [], fontes: [],
};

test('ida e volta duplica combustível e pedágios apenas do trecho cadastrado', () => {
  const ida = estimarCustoRota(rota, 25, 6, false);
  const volta = estimarCustoRota(rota, 25, 6, true);
  assert.equal(ida.distancia, 100);
  assert.equal(ida.litros, 4);
  assert.equal(ida.combustivel, 24);
  assert.equal(ida.total, 36);
  assert.equal(volta.distancia, 200);
  assert.equal(volta.pedagios, 24);
  assert.equal(volta.total, 72);
});

test('ausência de tarifa impede total e orçamento, sem inventar pedágio zero', () => {
  const custo = estimarCustoRota({ ...rota, pedagioIda: null }, 25, 6, false, 1);
  assert.equal(custo.combustivel, 24);
  assert.equal(custo.pedagios, null);
  assert.equal(custo.total, null);
  assert.equal(custo.acimaOrcamento, false);
});

test('sem consumo ou preço válido o custo fica desconhecido, mesmo com tarifa zero', () => {
  for (const valor of [null, NaN, Infinity, 0, -2]) {
    assert.equal(estimarCustoRota({ ...rota, pedagioIda: 0 }, valor, 6, false).total, null);
    assert.equal(estimarCustoRota({ ...rota, pedagioIda: 0 }, 25, valor, false).total, null);
  }
});

test('campos aceitam decimais brasileiros e rejeitam valores ambíguos ou inválidos', () => {
  assert.equal(lerNumeroRota(' 6,50 '), 6.5);
  assert.equal(lerNumeroRota('25.5'), 25.5);
  for (const texto of ['', ' ', '0', '-1', 'NaN', 'Infinity', '1.000,50', '6,5x', '1e5']) {
    assert.equal(lerNumeroRota(texto), null, texto);
  }
});

test('valores extremos não exibem infinito ou um total enganoso', () => {
  assert.equal(estimarCustoRota(rota, Number.MIN_VALUE, 6, false).total, null);
  assert.equal(estimarCustoRota(rota, 25, Number.MAX_VALUE, false).total, null);
  assert.equal(estimarCustoRota({ ...rota, pedagioIda: NaN }, 25, 6, false).total, null);
});

test('orçamento e autonomia comparam o trecho e preservam os limites exatos', () => {
  const dentro = estimarCustoRota(rota, 25, 6, false, 36, 60);
  assert.equal(dentro.acimaOrcamento, false);
  assert.equal(dentro.alertaAutonomia, false);
  const fora = estimarCustoRota(rota, 25, 6, true, 36, 59);
  assert.equal(fora.acimaOrcamento, true);
  assert.equal(fora.alertaAutonomia, true);
});

test('busca ignora acentos, filtra pavimento e curvas sem exigir GPS', () => {
  assert.equal(buscarRotas([rota], { busca: 'sao joao' }).length, 1);
  assert.equal(buscarRotas([rota], { busca: 'início', curvas: 'alto', pavimento: 'asfalto' }).length, 1);
  assert.equal(buscarRotas([rota], { pavimento: 'terra' }).length, 0);
  assert.equal(buscarRotas([rota], { curvas: 'baixo' }).length, 0);
  assert.equal(buscarRotas([rota], {}).at(0)?.distanciaInicioKm, null);
});

test('proximidade usa linha reta e não modifica o catálogo nem o custo', () => {
  const distante = { ...rota, id: 'distante', inicio: { ...rota.inicio, lat: -30 } };
  const catalogo = [distante, rota];
  const resultados = buscarRotas(catalogo, { origem: rota.inicio });
  assert.equal(resultados[0].rota.id, rota.id);
  assert.equal(resultados[0].distanciaInicioKm, 0);
  assert.equal(catalogo[0].id, 'distante');
  assert.equal(estimarCustoRota(resultados[1].rota, 25, 6, false).total, 36);
});

test('links externos distinguem aproximação ao início e trecho início-fim', () => {
  const links = linksNavegacaoRota(rota);
  const inicio = new URL(links.googleInicio);
  const trecho = new URL(links.googleTrecho);
  const waze = new URL(links.wazeInicio);
  assert.equal(inicio.searchParams.get('api'), '1');
  assert.equal(inicio.searchParams.get('destination'), '-23,-46');
  assert.equal(inicio.searchParams.has('origin'), false);
  assert.equal(trecho.searchParams.get('origin'), '-23,-46');
  assert.equal(trecho.searchParams.get('destination'), '-24,-47');
  assert.equal(waze.searchParams.get('ll'), '-23,-46');
  assert.equal(waze.searchParams.get('navigate'), 'yes');
  assert.equal(fonteRotaSegura('javascript:alert(1)'), false);
  assert.equal(fonteRotaSegura('https://example.com/rota'), true);
});

test('catálogo importado tem IDs únicos, coordenadas válidas e pedágios consistentes', () => {
  assert.equal(CATALOGO_ROTAS.length, 15);
  assert.equal(new Set(CATALOGO_ROTAS.map((r) => r.id)).size, CATALOGO_ROTAS.length);
  for (const r of CATALOGO_ROTAS) {
    assert.ok(Number.isFinite(r.distanciaKm) && r.distanciaKm > 0, r.id);
    for (const p of [r.inicio, r.fim, ...r.pontosApoio]) {
      assert.ok(Number.isFinite(p.lat) && Math.abs(p.lat) <= 90, r.id);
      assert.ok(Number.isFinite(p.lng) && Math.abs(p.lng) <= 180, r.id);
    }
    if (r.pedagios !== undefined) assert.ok(Math.abs(r.pedagios.reduce((s, p) => s + p.valorMoto, 0) - r.pedagioIda!) < 0.01, r.id);
  }
});
