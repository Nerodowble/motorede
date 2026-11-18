import { test } from 'node:test';
import assert from 'node:assert/strict';

/** /api/viagem com o openrouteservice (rota e POIs) e o Photon simulados (sem rede). */
process.env.ORS_API_KEY = 'chave-de-teste';
const RAIZ = new URL('../..', import.meta.url).href.replace(/\/$/, '');
const handler = (await import(`${RAIZ}/apps/web/api/viagem.ts`)).default;

function chamar(corpo: unknown): Promise<{ status: number; json: any }> {
  return new Promise((resolve) => {
    const req = { method: 'POST', body: corpo, headers: {} } as any;
    const res = {
      statusCode: 0,
      setHeader() {},
      end(texto: string) { resolve({ status: this.statusCode, json: JSON.parse(texto) }); },
    } as any;
    void handler(req, res);
  });
}

// Linha reta de ~600 km para o oeste, na latitude -23,5 (1 km ≈ 0,00978°).
const coords = Array.from({ length: 601 }, (_, i) => [-46.6 - i * 0.00978, -23.5]);
const lngDoKm = (km: number) => -46.6 - km * 0.00978;

let poisFora = false;
let pedidos: { url: string; corpo?: any }[] = [];
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  const corpo = init?.body ? JSON.parse(String(init.body)) : undefined;
  pedidos.push({ url: String(url), corpo });
  if (String(url).includes('directions')) {
    assert.equal((init?.headers as Record<string, string>).Authorization, 'chave-de-teste');
    return new Response(JSON.stringify({
      features: [{ geometry: { coordinates: coords }, properties: { summary: { distance: 600000, duration: 7 * 3600 } } }],
    }));
  }
  if (String(url).includes('/pois')) {
    if (poisFora) return new Response('fora', { status: 503 });
    assert.deepEqual(corpo.filters.category_ids, [596]);
    const lngs = corpo.geometry.geojson.coordinates.map((c: number[]) => c[0]);
    const [oeste, leste] = [Math.min(...lngs), Math.max(...lngs)];
    // Postos na beira da pista nos km 190 e 200; nenhum entre 360 e 420.
    const postos = [[190, 'Posto Km 190'], [200, 'Posto Km 200']] as const;
    const features = postos
      .filter(([km]) => lngDoKm(km) >= oeste && lngDoKm(km) <= leste)
      .map(([km, nome]) => ({ geometry: { coordinates: [lngDoKm(km), -23.501] }, properties: { osm_tags: { name: nome } } }));
    return new Response(JSON.stringify({ type: 'FeatureCollection', features }));
  }
  // Photon (reserva quando os POIs falham).
  return new Response(JSON.stringify({ features: [{ geometry: { coordinates: [lngDoKm(205), -23.52] }, properties: { name: 'Posto do Photon' } }] }));
}) as typeof fetch;

test('acha o posto na beira da estrada, o mais adiante antes da parada', async () => {
  poisFora = false; pedidos = [];
  const r = await chamar({ origem: { lat: -23.5, lng: -46.6 }, destino: { lat: -23.5, lng: -52.46 }, autonomiaKm: 280 });
  assert.equal(r.status, 200);
  assert.equal(r.json.distanciaKm, 600);
  assert.equal(r.json.duracaoH, 7);
  assert.deepEqual(r.json.paradas.map((p: any) => p.km), [210, 420]);
  assert.equal(r.json.paradas[0].posto?.nome, 'Posto Km 200'); // km 200 é mais adiante que o 190
  assert.ok(r.json.paradas[0].posto.distanciaKm <= 0.2);
  assert.equal(r.json.paradas[1].posto, null); // nada entre os km 360 e 420
  // uma rota + parada 1 (achou no primeiro trecho) + parada 2 (dois trechos)
  assert.equal(pedidos.length, 1 + 1 + 2);
  assert.ok(!pedidos.some((p) => p.url.includes('photon')), 'Photon só quando os POIs falham');
});

test('com a busca de POIs fora do ar, usa o Photon uma vez por parada', async () => {
  poisFora = true; pedidos = [];
  const r = await chamar({ origem: { lat: -23.5, lng: -46.6 }, destino: { lat: -23.5, lng: -52.46 }, autonomiaKm: 280 });
  assert.equal(r.status, 200);
  assert.equal(r.json.paradas[0].posto?.nome, 'Posto do Photon');
  assert.equal(pedidos.filter((p) => p.url.includes('photon')).length, 2);
});

test('sem autonomia não consulta postos', async () => {
  poisFora = false; pedidos = [];
  const r = await chamar({ origem: { lat: -23.5, lng: -46.6 }, destino: { lat: -23.5, lng: -52.46 } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.paradas, []);
  assert.equal(pedidos.length, 1);
});

test('recusa pedido sem destino válido', async () => {
  const r = await chamar({ origem: { lat: -23.5, lng: -46.6 }, destino: { lat: 'x' } });
  assert.equal(r.status, 400);
});

test.after(() => { globalThis.fetch = fetchOriginal; });
