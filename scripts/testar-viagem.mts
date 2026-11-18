/**
 * Teste de ponta a ponta do planejamento de viagem, com as APIs reais:
 * busca do destino (Photon) → /api/viagem (openrouteservice + postos do
 * Overpass) → pedágios da tabela de SP → custo.
 *
 * Uso (da raiz): npx tsx scripts/testar-viagem.mts "Foz do Iguaçu" [lat,lng da origem]
 * Lê ORS_API_KEY de apps/web/.env.local e nunca a imprime.
 */
import { readFileSync } from 'node:fs';
import {
  autonomiaKm, custoViagem, lerResultadosPhoton, pedagiosNoTrajeto, resumirPedagios, urlBuscaLugar,
  type RotaViagem, type TabelaPedagios,
} from '../packages/shared/src/index.ts';

const linha = readFileSync('apps/web/.env.local', 'utf-8').split(/\r?\n/).find((l) => l.startsWith('ORS_API_KEY='));
process.env.ORS_API_KEY = (linha ?? '').slice('ORS_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
if (!process.env.ORS_API_KEY) throw new Error('ORS_API_KEY vazia em apps/web/.env.local');

const destinoTexto = process.argv[2] ?? 'Foz do Iguaçu';
const [lat, lng] = (process.argv[3] ?? '-23.5505,-46.6333').split(',').map(Number);
const origem = { lat, lng };

// Destino pelo Photon; se ele não responder (já bloqueou este computador uma
// vez), pela busca de endereços do openrouteservice, com a mesma chave.
let destino: { nome: string; detalhe: string; lat: number; lng: number } | undefined;
try {
  const busca = await (await fetch(urlBuscaLugar(destinoTexto, origem)!, { signal: AbortSignal.timeout(8000) })).json();
  destino = lerResultadosPhoton(busca)[0];
  console.log('Busca do destino: Photon');
} catch {
  const qs = new URLSearchParams({ text: destinoTexto, 'boundary.country': 'BR', size: '1' });
  const r = await fetch(`https://api.openrouteservice.org/geocode/search?${qs}`, { headers: { Authorization: process.env.ORS_API_KEY! } });
  console.log(`Busca do destino: Photon fora; openrouteservice respondeu HTTP ${r.status}`);
  const f = ((await r.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: { name: string; region_a?: string } }[] }).features?.[0];
  if (f) destino = { nome: f.properties.name, detalhe: f.properties.region_a ?? '', lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
}
if (!destino) throw new Error(`Nada encontrado para "${destinoTexto}"`);
console.log(`Destino: ${destino.nome} · ${destino.detalhe} (${destino.lat.toFixed(4)}, ${destino.lng.toFixed(4)})`);

const handler = (await import('../apps/web/api/viagem.ts')).default;
const autonomia = autonomiaKm(14, 20); // moto de exemplo: 14 l, 20 km/l
const rota: RotaViagem = await new Promise((resolve, reject) => {
  const res = { statusCode: 0, setHeader() {}, end(t: string) { this.statusCode === 200 ? resolve(JSON.parse(t)) : reject(new Error(`${this.statusCode} ${t}`)); } };
  void handler({ method: 'POST', body: { origem, destino, autonomiaKm: autonomia }, headers: {} } as never, res as never);
});

console.log(`Rota: ${rota.distanciaKm} km, ${rota.duracaoH} h, ${rota.geometria.length} pontos no traçado`);
for (const p of rota.paradas) console.log(`  parada km ${p.km}: ${p.posto ? `${p.posto.nome} (a ${p.posto.distanciaKm} km da estrada)` : 'sem posto no mapa por perto'}`);

const tabela: TabelaPedagios = JSON.parse(readFileSync('apps/web/public/dados/pedagios-sp.json', 'utf-8'));
const pedagios = pedagiosNoTrajeto(rota.geometria, tabela.pracas);
for (const { praca, km } of pedagios) console.log(`  pedágio km ${Math.round(km)}: ${praca.nome} (${praca.rodovia}) → ${praca.situacaoMoto}${praca.motoReais ? ` R$ ${praca.motoReais}` : ''}`);
const resumo = resumirPedagios(pedagios);
const custo = custoViagem(rota.distanciaKm, 20, 6.29, resumo.totalMoto, false);
console.log(`Pedágios SP: R$ ${resumo.totalMoto} (${resumo.pagas} pagas, ${resumo.isentas} isentas, ${resumo.aConfirmar} a confirmar)`);
console.log(`Custo (20 km/l, R$ 6,29): ${custo.litros} l, combustível R$ ${custo.combustivel}, total R$ ${custo.total}`);
