import type { IncomingMessage, ServerResponse } from 'node:http';
import { MINIMO_LETRAS_BUSCA, lerResultadosOrsGeocode } from '@motorede/shared';

/**
 * GET /api/lugares?q=foz&lat=-23.5&lng=-46.6
 *
 * Reserva da busca de destino do planejamento de viagem. O app e a web buscam
 * primeiro no Photon (direto do aparelho, sem conta); se ele não responder,
 * caem aqui: busca de endereços do openrouteservice, com a chave do servidor.
 * Em 2026-11-17 o Photon bloqueou o computador de teste depois de uma rajada
 * de consultas, e sem busca o planejamento inteiro para.
 */
const ORS_AUTOCOMPLETE = 'https://api.openrouteservice.org/geocode/autocomplete';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const responder = (codigo: number, corpo: unknown) => {
    res.statusCode = codigo;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(corpo));
  };
  if (req.method !== 'GET') return responder(405, { error: 'Method Not Allowed' });
  const chave = process.env.ORS_API_KEY;
  if (!chave) return responder(503, { error: 'Busca indisponível.' });

  const url = new URL(req.url ?? '', 'http://x');
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < MINIMO_LETRAS_BUSCA) return responder(200, { lugares: [] });

  const qs = new URLSearchParams({ text: q, size: '8' });
  const lat = Number(url.searchParams.get('lat')), lng = Number(url.searchParams.get('lng'));
  if (Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.has('lat')) {
    qs.set('focus.point.lat', String(lat)); qs.set('focus.point.lon', String(lng));
  }
  try {
    const r = await fetch(`${ORS_AUTOCOMPLETE}?${qs}`, { headers: { Authorization: chave }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      console.error('lugares: openrouteservice respondeu', r.status);
      return responder(502, { error: 'A busca não respondeu.' });
    }
    return responder(200, { lugares: lerResultadosOrsGeocode(await r.json()) });
  } catch {
    return responder(502, { error: 'A busca não respondeu.' });
  }
}
