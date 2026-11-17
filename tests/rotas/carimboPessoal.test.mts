import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avaliarCarimbo, explicarRecusa, fotoRecente, ultimoCarimboPorMonumento, RAIO_CARIMBO_PESSOAL_KM,
  type CarimboPessoal,
} from '../../packages/shared/src/domain/carimboPessoal.ts';

// Nº 10, Jaguarão: pino oficial no Free Shop, carimbo na loja a ~1,6 km.
const pinoFreeShop = { lat: -32.5522043, lng: -53.3838142 };
const loja = { lat: -32.5649973, lng: -53.3782721 };

test('nas proximidades libera: a loja de Jaguarão fica dentro do raio do pino', () => {
  const a = avaliarCarimbo(pinoFreeShop, loja, 15);
  assert.equal(a.pode, true);
  assert.ok(a.distanciaKm > 1 && a.distanciaKm < RAIO_CARIMBO_PESSOAL_KM);
});

test('longe não libera e diz a distância', () => {
  const a = avaliarCarimbo(pinoFreeShop, { lat: -32.6, lng: -53.3838142 }, 10);
  assert.equal(a.pode, false);
  if (a.pode) return;
  assert.equal(a.motivo, 'longe');
  assert.match(explicarRecusa(a, { nome: 'Terrasul Motos' }), /a 5,3 km de Terrasul Motos/);
});

test('GPS impreciso pede para esperar em vez de decidir no escuro', () => {
  const a = avaliarCarimbo(pinoFreeShop, pinoFreeShop, 2500);
  assert.equal(a.pode, false);
  if (a.pode) return;
  assert.equal(a.motivo, 'gps-impreciso');
  assert.match(explicarRecusa(a, { nome: 'x' }), /impreciso/);
});

test('sem precisão informada decide só pela distância', () => {
  assert.equal(avaliarCarimbo(pinoFreeShop, loja, null).pode, true);
});

test('foto da galeria só vale se tirada nas últimas horas', () => {
  const agora = new Date(2026, 10, 17, 18, 0, 0);
  assert.equal(fotoRecente('2026:11:17 17:30:00', agora), true);
  assert.equal(fotoRecente('2026:11:17 06:30:00', agora), true);
  assert.equal(fotoRecente('2026:11:16 17:30:00', agora), false);
  assert.equal(fotoRecente('2026:11:17 19:00:00', agora), false); // no futuro
  assert.equal(fotoRecente(null, agora), false);
  assert.equal(fotoRecente('ontem', agora), false);
});

test('mostra o carimbo mais recente de cada monumento', () => {
  const c = (monumento: number, em: string): CarimboPessoal =>
    ({ id: `${monumento}-${em}`, monumento, em, lat: 0, lng: 0, precisaoM: null, distanciaKm: 0, foto: '' });
  const mapa = ultimoCarimboPorMonumento([c(1, '2026-01-01T10:00:00Z'), c(1, '2026-03-01T10:00:00Z'), c(2, '2026-02-01T10:00:00Z')]);
  assert.equal(mapa.size, 2);
  assert.equal(mapa.get(1)?.em, '2026-03-01T10:00:00Z');
});
