/**
 * Sonda a busca de pontos de interesse (POIs) do openrouteservice: qual
 * endereço responde, qual o código da categoria "fuel" e se acha postos ao
 * longo de um trecho de estrada. Lê ORS_API_KEY de apps/web/.env.local e nunca
 * a imprime. Uso (da raiz): npx tsx scripts/sondar-pois.mts
 */
import { readFileSync } from 'node:fs';

const linha = readFileSync('apps/web/.env.local', 'utf-8').split(/\r?\n/).find((l) => l.startsWith('ORS_API_KEY='));
const chave = (linha ?? '').slice('ORS_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
if (!chave) throw new Error('ORS_API_KEY vazia em apps/web/.env.local');

const ENDERECOS = [
  'https://api.heigit.org/openrouteservice/pois',
  'https://api.heigit.org/pois',
  'https://api.openrouteservice.org/pois',
];

async function post(url: string, corpo: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: chave, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(20000),
  });
  return { status: r.status, texto: (await r.text()).replaceAll(chave, '***') };
}

// Castello Branco (SP-280) perto de Itatinga, ~25 km.
const trecho = { type: 'LineString', coordinates: [[-48.45, -23.05], [-48.6, -23.1], [-48.68, -23.12]] };

for (const url of ENDERECOS) {
  console.log(`\n== ${url}`);
  try {
    const lista = await post(url, { request: 'list' });
    console.log(`list: HTTP ${lista.status}`);
    let idFuel: number | null = null;
    if (lista.status === 200) {
      // Procura qualquer categoria com "fuel" no nome, em qualquer nível.
      const achar = (o: unknown): void => {
        if (!o || typeof o !== 'object') return;
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (k === 'fuel' && typeof v === 'number') idFuel = v;
          achar(v);
        }
      };
      achar(JSON.parse(lista.texto));
      console.log(`categoria fuel: ${idFuel ?? 'não achei'}`);
    } else {
      console.log(lista.texto.slice(0, 200));
    }
    const corpo = {
      request: 'pois',
      geometry: { geojson: trecho, buffer: 500 },
      ...(idFuel ? { filters: { category_ids: [idFuel] } } : {}),
      limit: 50,
    };
    const pois = await post(url, corpo);
    console.log(`pois: HTTP ${pois.status}`);
    if (pois.status === 200) {
      const j = JSON.parse(pois.texto) as { features?: { geometry: { coordinates: number[] }; properties?: { osm_tags?: { name?: string; brand?: string } } }[] };
      const f = j.features ?? [];
      console.log(`${f.length} pontos no trecho:`, f.slice(0, 8).map((x) => x.properties?.osm_tags?.name ?? x.properties?.osm_tags?.brand ?? '(sem nome)'));
    } else {
      console.log(pois.texto.slice(0, 300));
    }
  } catch (e) {
    console.log(`sem resposta: ${(e as Error).message}`);
  }
}
