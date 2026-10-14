import { distanceKm, type GeoPoint } from './sos.js';
import type { RotaCatalogo } from './rotas.js';

/**
 * Monumento ao Cumprimento Biker: ponto de carimbo do passaporte da Rota Biker.
 * É um lugar, não um trecho; por isso não usa o contrato `RotaCatalogo`.
 * A coordenada é a da cidade, não a do estabelecimento.
 */
export interface MonumentoRotaBiker extends GeoPoint {
  numero: number;
  nome: string;
  cidade: string;
  uf: string;
  pais: string;
  situacao: 'carimbando' | 'em_construcao';
  instagram?: string;
}

export const SITE_ROTA_BIKER = 'https://monumentobikers.com.br/';
export const AVISO_ROTA_BIKER =
  'Lista do site oficial da Rota Biker. O MotoRede não carimba passaportes: confirme horário e carimbo com o local antes de ir.';
export const RAIO_CARIMBO_NA_ROTA_KM = 20;

export interface FiltrosRotaBiker {
  busca?: string;
  origem?: GeoPoint | null;
  ordem?: 'numero' | 'proximidade';
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function buscarMonumentos(lista: readonly MonumentoRotaBiker[], filtros: FiltrosRotaBiker = {}) {
  const busca = normalizar(filtros.busca?.trim() ?? '');
  return lista.filter((m) => !busca || normalizar(`${m.numero} ${m.nome} ${m.cidade} ${m.uf} ${m.pais}`).includes(busca))
    .map((monumento) => ({ monumento, distanciaKm: filtros.origem ? distanceKm(filtros.origem, monumento) : null }))
    .sort((a, b) => filtros.ordem === 'proximidade' && a.distanciaKm !== null && b.distanciaKm !== null
      ? a.distanciaKm - b.distanciaKm : a.monumento.numero - b.monumento.numero);
}

/** Busca pelo nome do local: a coordenada guardada é só da cidade. */
export function linkMapaMonumento(m: MonumentoRotaBiker) {
  const consulta = `${m.nome}, ${m.cidade} - ${m.uf}, ${m.pais}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

export function linkInstagramMonumento(m: MonumentoRotaBiker): string | null {
  return m.instagram && /^[A-Za-z0-9._]+$/.test(m.instagram) ? `https://www.instagram.com/${m.instagram}/` : null;
}

/** Carimbos perto do início, do fim ou de um ponto de apoio da rota (linha reta). */
export function monumentosPertoDaRota(
  rota: RotaCatalogo, lista: readonly MonumentoRotaBiker[], raioKm = RAIO_CARIMBO_NA_ROTA_KM,
) {
  const pontos: GeoPoint[] = [rota.inicio, rota.fim, ...rota.pontosApoio];
  return lista.filter((m) => pontos.some((p) => distanceKm(p, m) <= raioKm));
}
