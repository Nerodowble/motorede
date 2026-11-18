import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  kmDasParadas, autonomiaKm, oleoNaViagem, custoViagem, linkGoogleMapsViagem, pedagiosNoTrajeto,
  resumirPedagios, distanciasAcumuladas, pontoNoKm, simplificarTracado, type PontoLngLat,
} from '../../packages/shared/src/domain/planoViagem.ts';
import type { PracaPedagio, TabelaPedagios } from '../../packages/shared/src/domain/pedagios.ts';

test('paradas a cada 75% da autonomia, saindo de tanque cheio', () => {
  const aut = autonomiaKm(14, 20); // 280 km
  assert.equal(aut, 280);
  assert.deepEqual(kmDasParadas(1049, aut), [210, 420, 630, 840]);
  assert.deepEqual(kmDasParadas(250, aut), []); // cabe no tanque
  assert.deepEqual(kmDasParadas(1049, null), []);
});

test('troca de óleo: vencida, durante a viagem ou depois', () => {
  assert.deepEqual(oleoNaViagem(34000, 36000, 1049), { situacao: 'depois', sobraKm: 951 });
  assert.deepEqual(oleoNaViagem(35500, 36000, 1049), { situacao: 'na-viagem', kmDaViagem: 500 });
  assert.deepEqual(oleoNaViagem(36200, 36000, 1049), { situacao: 'vencida', passouKm: 200 });
  assert.equal(oleoNaViagem(34000, null, 1049), null);
});

test('custo: combustível + pedágio, e ida e volta dobra', () => {
  const ida = custoViagem(1000, 20, 6.5, 30, false);
  assert.deepEqual(ida, { distanciaKm: 1000, litros: 50, combustivel: 325, pedagios: 30, total: 355 });
  assert.equal(custoViagem(1000, 20, 6.5, 30, true).total, 710);
  assert.equal(custoViagem(1000, null, 6.5, 30, false).total, null); // sem consumo não inventa
});

test('link do Google Maps leva as paradas, no máximo 9', () => {
  const p = { lat: -23.5, lng: -46.6 };
  const url = linkGoogleMapsViagem(p, { lat: -25.5, lng: -54.5 }, Array.from({ length: 12 }, () => p));
  const qs = new URL(url).searchParams;
  assert.equal(qs.get('api'), '1');
  assert.equal(qs.get('waypoints')!.split('|').length, 9);
});

const praca = (over: Partial<PracaPedagio>): PracaPedagio => ({
  id: 'x', uf: 'SP', lote: 'L00', concessionaria: 'c', nome: 'n', rodovia: 'SP-000', km: 0, sentido: 'NORTE',
  municipio: null, lat: 0, lng: 0, cobranca: 'cabine', situacaoMoto: 'paga', motoReais: 5, carroReais: 10,
  vigenciaDesde: null, fonte: 'f', consultadoEm: '2026-11-17', ...over,
});

// Estrada reta indo para o norte (lat aumenta), ~20 km.
const paraONorte: PontoLngLat[] = Array.from({ length: 101 }, (_, i) => [-47, -23 + i * 0.0018]);

test('pedágio só conta no trajeto e no sentido da viagem', () => {
  const achados = pedagiosNoTrajeto(paraONorte, [
    praca({ id: 'norte', lat: -22.99, lng: -47, sentido: 'NORTE', motoReais: 5 }),
    praca({ id: 'sul', lat: -22.989, lng: -47, sentido: 'SUL', motoReais: 5 }), // sentido contrário
    praca({ id: 'longe', lat: -22.99, lng: -46.95, sentido: 'NORTE' }), // 5 km ao lado
    praca({ id: 'isenta', lat: -22.9, lng: -47, sentido: 'AMBOS', situacaoMoto: 'isenta', motoReais: 0 }),
  ]);
  assert.deepEqual(achados.map((a) => a.praca.id), ['norte', 'isenta']);
  assert.deepEqual(resumirPedagios(achados), { totalMoto: 5, pagas: 1, isentas: 1, aConfirmar: 0 });
});

test('duas cabines vizinhas da mesma praça contam uma vez', () => {
  const achados = pedagiosNoTrajeto(paraONorte, [
    praca({ id: 'a', lat: -22.99, lng: -47, sentido: 'Crescente' }),
    praca({ id: 'b', lat: -22.985, lng: -47, sentido: 'Decrescente' }),
  ]);
  assert.equal(achados.length, 1);
});

test('tabela real: a praça de Itatiba entra num trajeto que passa por cima dela', () => {
  const tabela: TabelaPedagios = JSON.parse(readFileSync('apps/web/public/dados/pedagios-sp.json', 'utf-8'));
  const alvo = tabela.pracas.find((p) => p.nome.includes('Itatiba') && p.lat != null);
  assert.ok(alvo, 'praça de Itatiba na tabela');
  const linha: PontoLngLat[] = [[alvo.lng! - 0.05, alvo.lat!], [alvo.lng! + 0.05, alvo.lat!]];
  const ida = pedagiosNoTrajeto(linha, tabela.pracas);
  const volta = pedagiosNoTrajeto([...linha].reverse(), tabela.pracas);
  assert.ok(ida.length + volta.length >= 1, 'achou a praça em algum sentido');
});

test('traçado simplificado mantém começo, fim e a distância', () => {
  const linha: PontoLngLat[] = Array.from({ length: 1001 }, (_, i) => [-47, -23 + i * 0.0001]); // ~11 km
  const s = simplificarTracado(linha);
  assert.ok(s.length < 80);
  assert.deepEqual(s[0], linha[0]);
  assert.deepEqual(s[s.length - 1], linha[linha.length - 1]);
  const total = (l: PontoLngLat[]) => distanciasAcumuladas(l).at(-1)!;
  assert.ok(Math.abs(total(s) - total(linha)) < 0.05);
  const meio = pontoNoKm(s, distanciasAcumuladas(s), total(s) / 2);
  assert.ok(Math.abs(meio.lat - -22.95) < 0.002);
});

test('busca de lugar: cidade do Brasil antes de rua e de lugar no exterior', async () => {
  const { lerResultadosPhoton, urlBuscaLugar } = await import('../../packages/shared/src/domain/buscaLugar.ts');
  assert.equal(urlBuscaLugar('fo'), null);
  assert.match(urlBuscaLugar('foz', { lat: -23.5, lng: -46.6 })!, /location_bias_scale=0\.1/);
  const f = (name: string, osm_key: string, countrycode: string, state = 'Paraná', city?: string) =>
    ({ geometry: { coordinates: [-54.5, -25.5] }, properties: { name, osm_key, countrycode, state, city, country: 'Argentina' } });
  const r = lerResultadosPhoton({ features: [
    f('Rua Foz do Iguaçu', 'highway', 'BR', 'São Paulo', 'São Paulo'),
    f('Puerto Iguazú', 'place', 'AR', 'Misiones'),
    f('Foz do Iguaçu', 'place', 'BR'),
    f('Foz do Iguaçu', 'place', 'BR'), // repetido
  ] });
  assert.deepEqual(r.map((l) => `${l.nome} · ${l.detalhe}`), [
    'Foz do Iguaçu · PR', 'Rua Foz do Iguaçu · São Paulo, SP', 'Puerto Iguazú · Misiones, Argentina',
  ]);
});

test('reserva da busca (openrouteservice) no mesmo formato do Photon', async () => {
  const { lerResultadosOrsGeocode } = await import('../../packages/shared/src/domain/buscaLugar.ts');
  const f = (name: string, layer: string, country_a: string, region_a?: string, locality?: string) =>
    ({ geometry: { coordinates: [-54.55, -25.51] }, properties: { name, layer, country_a, region_a, locality, country: 'Paraguai', region: 'Alto Paraná' } });
  const r = lerResultadosOrsGeocode({ features: [
    f('Rua Foz do Iguaçu', 'street', 'BRA', 'SP', 'Mauá'),
    f('Ciudad del Este', 'locality', 'PRY'),
    f('Foz do Iguacu', 'locality', 'BRA', 'PR'),
  ] });
  assert.deepEqual(r.map((l) => `${l.nome} · ${l.detalhe}`), [
    'Foz do Iguacu · PR', 'Rua Foz do Iguaçu · Mauá, SP', 'Ciudad del Este · Alto Paraná, Paraguai',
  ]);
});
