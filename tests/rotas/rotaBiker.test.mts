import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buscarMonumentos, linkMapaMonumento, linkInstagramMonumento, monumentosPertoDaRota,
  type MonumentoRotaBiker,
} from '../../packages/shared/src/domain/rotaBiker.ts';
import type { RotaCatalogo } from '../../packages/shared/src/domain/rotas.ts';
import { MONUMENTOS_ROTA_BIKER } from '../../packages/shared/src/data/monumentosRotaBiker.ts';
import { CATALOGO_ROTAS } from '../../packages/shared/src/data/catalogoRotas.ts';

const base: MonumentoRotaBiker = {
  numero: 1, nome: 'Café', cidade: 'São Paulo', uf: 'SP', pais: 'Brasil',
  lat: -23.55, lng: -46.63, situacao: 'carimbando',
};

test('lista oficial: números únicos, coordenadas válidas e Instagram seguro', () => {
  const numeros = MONUMENTOS_ROTA_BIKER.map(m => m.numero);
  assert.equal(new Set(numeros).size, numeros.length);
  assert.ok(MONUMENTOS_ROTA_BIKER.length >= 40);
  for (const m of MONUMENTOS_ROTA_BIKER) {
    assert.ok(m.lat < 6 && m.lat > -34 && m.lng < -34 && m.lng > -74, `${m.numero} fora da região`);
    if (m.instagram) assert.ok(linkInstagramMonumento(m), `${m.numero} com Instagram inválido`);
  }
});

test('busca ignora acento e caixa; ordena por número ou proximidade', () => {
  const lista = [{ ...base, numero: 2, cidade: 'Jundiaí', lat: -23.19, lng: -46.88 }, { ...base, numero: 5, cidade: 'Socorro', lat: -22.59, lng: -46.52 }];
  assert.deepEqual(buscarMonumentos(lista, { busca: 'JUNDIAI' }).map(r => r.monumento.numero), [2]);
  assert.deepEqual(buscarMonumentos(lista).map(r => r.monumento.numero), [2, 5]);
  assert.deepEqual(buscarMonumentos(lista, { ordem: 'proximidade', origem: { lat: -22.6, lng: -46.5 } }).map(r => r.monumento.numero), [5, 2]);
  assert.equal(buscarMonumentos(lista)[0].distanciaKm, null);
});

test('links: mapa busca pelo nome do local; Instagram recusa handle estranho', () => {
  assert.match(linkMapaMonumento(base), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Caf%C3%A9%2C%20S%C3%A3o%20Paulo/);
  assert.equal(linkInstagramMonumento(base), null);
  assert.equal(linkInstagramMonumento({ ...base, instagram: 'bar.do_x' }), 'https://www.instagram.com/bar.do_x/');
  assert.equal(linkInstagramMonumento({ ...base, instagram: 'x/../y' }), null);
});

test('carimbos perto da rota usam início, fim e pontos de apoio', () => {
  const rota = {
    inicio: { cidade: 'A', lat: -23.55, lng: -46.63 }, fim: { cidade: 'B', lat: -25, lng: -49 },
    pontosApoio: [{ nome: 'P', tipo: 'posto_gasolina', descricao: '', lat: -24, lng: -48 }],
  } as RotaCatalogo;
  const longe = { ...base, numero: 9, lat: -10, lng: -40 };
  const noApoio = { ...base, numero: 8, lat: -24.05, lng: -48.05 };
  assert.deepEqual(monumentosPertoDaRota(rota, [base, longe, noApoio]).map(m => m.numero), [1, 8]);
  const rioDoRastro = CATALOGO_ROTAS.find(r => r.id === 'serra-do-rio-do-rastro-sc')!;
  assert.ok(monumentosPertoDaRota(rioDoRastro, MONUMENTOS_ROTA_BIKER).some(m => m.nome === 'Mirante do 12'));
});
