import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  FAIXA_BUSCA_POSTO_M, TRECHOS_BUSCA_POSTO_KM, distanciasAcumuladas, kmDasParadas, pontoNoKm, projetarNoTracado,
  simplificarTracado, trechoDoTracado,
  type GeoPoint, type ParadaViagem, type PontoLngLat, type RotaViagem,
} from '@motorede/shared';

/**
 * POST /api/viagem { origem: {lat,lng}, destino: {lat,lng}, autonomiaKm?: number }
 *
 * Planejar viagem (ideia 40): traçado e distância pelo openrouteservice
 * (conta gratuita, chave ORS_API_KEY só aqui no servidor) e, para cada parada
 * de abastecimento, um posto na beira da estrada (pontos de interesse do
 * openrouteservice; reserva no Photon). O resto da conta (combustível, pedágios, óleo) é feito no cliente
 * com packages/shared/src/domain/planoViagem.ts.
 *
 * Endereço novo do openrouteservice desde 2026: api.heigit.org (o antigo,
 * api.openrouteservice.org, foi descontinuado).
 */

const ORS = 'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson';
const ORS_POIS = 'https://api.openrouteservice.org/pois';
/** Categoria "fuel" na lista de POIs do openrouteservice (request: 'list'). */
const CATEGORIA_POSTO = 596;
const PHOTON_REVERSO = 'https://photon.komoot.io/reverse';

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const pronto = (req as { body?: unknown }).body;
  if (typeof pronto === 'object' && pronto) return pronto as Record<string, unknown>;
  if (typeof pronto === 'string') {
    try { return JSON.parse(pronto) as Record<string, unknown>; } catch { return {}; }
  }
  const partes: Buffer[] = [];
  for await (const p of req) partes.push(p as Buffer);
  try { return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}') as Record<string, unknown>; } catch { return {}; }
}

function lerPonto(v: unknown): GeoPoint | null {
  const p = v as { lat?: unknown; lng?: unknown } | null;
  const lat = Number(p?.lat), lng = Number(p?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

type Posto = { nome: string; lat: number; lng: number };
type FeaturePoi = { geometry?: { coordinates?: [number, number] }; properties?: { osm_tags?: { name?: string; brand?: string } } };

/**
 * Postos ao longo de um trecho da estrada (até 500 m da pista): busca de
 * pontos de interesse do openrouteservice, com a mesma chave da rota.
 *
 * Só existe no endereço ANTIGO (api.openrouteservice.org/pois): no novo,
 * api.heigit.org, responde 404 (sondado em 2026-11-17 com
 * scripts/sondar-pois.mts). Se o antigo sair do ar, cai no Photon abaixo.
 * null = a busca falhou (diferente de "não há posto no trecho").
 */
async function postosNoTrecho(chave: string, linha: PontoLngLat[]): Promise<Posto[] | null> {
  try {
    const r = await fetch(ORS_POIS, {
      method: 'POST',
      headers: { Authorization: chave, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        request: 'pois',
        geometry: { geojson: { type: 'LineString', coordinates: linha }, buffer: FAIXA_BUSCA_POSTO_M },
        filters: { category_ids: [CATEGORIA_POSTO] },
        limit: 50,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      console.error('viagem: pois respondeu', r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const features = ((await r.json()) as { features?: FeaturePoi[] }).features ?? [];
    return features.flatMap((f) => {
      const c = f.geometry?.coordinates;
      const t = f.properties?.osm_tags ?? {};
      return c ? [{ nome: t.name || t.brand || 'Posto (sem nome no mapa)', lng: c[0], lat: c[1] }] : [];
    });
  } catch {
    return null;
  }
}

/**
 * Reserva: o posto mais próximo de um ponto pela busca reversa do Photon
 * (OpenStreetMap, sem conta). UMA consulta por parada: em rajada o Photon
 * bloqueia o endereço (aconteceu no teste com 12 consultas simultâneas), e na
 * Vercel todos os pilotos saem pelos mesmos endereços.
 */
async function postoPeloPhoton(p: GeoPoint): Promise<Posto | null> {
  try {
    const qs = new URLSearchParams({ lat: String(p.lat), lon: String(p.lng), osm_tag: 'amenity:fuel', radius: '10', limit: '1' });
    const r = await fetch(`${PHOTON_REVERSO}?${qs}`, { headers: { 'User-Agent': 'MotoRede/1.0' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const f = ((await r.json()) as { features?: { geometry?: { coordinates?: [number, number] }; properties?: { name?: string } }[] }).features?.[0];
    const c = f?.geometry?.coordinates;
    return c ? { nome: f.properties?.name || 'Posto (sem nome no mapa)', lng: c[0], lat: c[1] } : null;
  } catch {
    return null;
  }
}

/**
 * Posto para uma parada: procura ao longo da estrada nos 30 km antes do ponto
 * da parada e, sem nada ali, nos 30 km anteriores. Fica com o que está mais
 * adiante (aproveita melhor o tanque). Antes buscava em volta de um ponto e
 * pegava o mais perto em linha reta: às vezes era um posto dentro de uma
 * cidade a 12 km da rodovia.
 */
async function postoDaParada(chave: string, geometria: PontoLngLat[], acumulado: number[], km: number): Promise<ParadaViagem['posto']> {
  for (const [antes, depois] of TRECHOS_BUSCA_POSTO_KM) {
    if (km - antes < 0 && km - depois <= 0) break;
    const linha = simplificarTracado(trechoDoTracado(geometria, acumulado, km - antes, km - depois), 0.5);
    const postos = await postosNoTrecho(chave, linha);
    if (postos === null) {
      const p = await postoPeloPhoton(pontoNoKm(geometria, acumulado, km));
      if (!p) return null;
      const proj = projetarNoTracado(geometria, acumulado, p);
      return { ...p, distanciaKm: Math.round(proj.distanciaKm * 10) / 10 };
    }
    let melhor: (Posto & { km: number; distanciaKm: number }) | null = null;
    for (const p of postos) {
      const proj = projetarNoTracado(geometria, acumulado, p);
      if (proj.km > km + 1) continue;
      if (!melhor || proj.km > melhor.km) melhor = { ...p, ...proj };
    }
    if (melhor) return { nome: melhor.nome, lat: melhor.lat, lng: melhor.lng, distanciaKm: Math.round(melhor.distanciaKm * 10) / 10 };
  }
  return null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const responder = (codigo: number, corpo: unknown) => {
    res.statusCode = codigo;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(corpo));
  };

  if (req.method !== 'POST') return responder(405, { error: 'Method Not Allowed' });
  const chave = process.env.ORS_API_KEY;
  if (!chave) return responder(503, { error: 'O planejamento de viagem não está configurado no servidor.' });

  const corpo = await lerCorpo(req);
  const origem = lerPonto(corpo.origem);
  const destino = lerPonto(corpo.destino);
  if (!origem || !destino) return responder(400, { error: 'Informe origem e destino.' });
  const autonomia = Number(corpo.autonomiaKm);
  const autonomiaKm = Number.isFinite(autonomia) && autonomia >= 30 && autonomia <= 2000 ? autonomia : null;

  let geometria: PontoLngLat[];
  let distanciaKm: number;
  let duracaoH: number;
  try {
    const r = await fetch(ORS, {
      method: 'POST',
      headers: { Authorization: chave, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
      body: JSON.stringify({ coordinates: [[origem.lng, origem.lat], [destino.lng, destino.lat]] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      // 404 do ORS = não achou estrada perto de um dos pontos (ex.: no meio do mar).
      console.error('viagem: openrouteservice respondeu', r.status, (await r.text()).slice(0, 300));
      return r.status === 404 || r.status === 400
        ? responder(422, { error: 'Não foi possível traçar uma rota entre esses pontos. Escolha um destino perto de uma estrada.' })
        : responder(502, { error: 'O serviço de rotas não respondeu. Tente de novo em instantes.' });
    }
    const dados = (await r.json()) as { features?: { geometry?: { coordinates?: PontoLngLat[] }; properties?: { summary?: { distance?: number; duration?: number } } }[] };
    const f = dados.features?.[0];
    const coords = f?.geometry?.coordinates;
    if (!coords?.length || !f?.properties?.summary) return responder(502, { error: 'O serviço de rotas devolveu uma resposta vazia.' });
    geometria = simplificarTracado(coords);
    distanciaKm = Math.round((f.properties.summary.distance ?? 0) / 100) / 10;
    duracaoH = Math.round((f.properties.summary.duration ?? 0) / 360) / 10;
  } catch (erro) {
    console.error('viagem:', erro);
    return responder(502, { error: 'O serviço de rotas não respondeu. Tente de novo em instantes.' });
  }

  const acumulado = distanciasAcumuladas(geometria);
  const kms = kmDasParadas(distanciaKm, autonomiaKm);
  const postos = await Promise.all(kms.map((km) => postoDaParada(chave, geometria, acumulado, km)));
  const paradas: ParadaViagem[] = kms.map((km, i) => ({ km, ponto: pontoNoKm(geometria, acumulado, km), posto: postos[i] }));

  const resposta: RotaViagem = { distanciaKm, duracaoH, geometria, paradas };
  return responder(200, resposta);
}
