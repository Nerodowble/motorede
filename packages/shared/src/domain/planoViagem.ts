import type { GeoPoint } from './sos.js';
import type { PracaPedagio } from './pedagios.js';

/**
 * Planejar viagem (ideia 40 em docs/ideias.md): de onde o piloto está até um
 * destino qualquer, com combustível, pedágios, paradas para abastecer e troca
 * de óleo. Funções puras; a rota (openrouteservice) e os postos (OpenStreetMap)
 * vêm de /api/viagem, e a tabela de pedágios de /dados/pedagios-sp.json.
 *
 * Honestidade antes de tudo: o que não sabemos aparece como desconhecido. O
 * pedágio só cobre as praças da tabela (por ora, SP); a tela tem de dizer isso.
 */

/** [lng, lat], como vem do GeoJSON. */
export type PontoLngLat = [number, number];

/** Abastecer quando restar ~25% do tanque: margem para posto fechado ou sem a gasolina. */
export const FRACAO_TANQUE_PARADA = 0.75;
/** Distância máxima entre a praça e o traçado para contar como "no trajeto". */
export const TOLERANCIA_PEDAGIO_KM = 0.2;
/** Praças mais próximas que isso, na mesma estrada, são o mesmo pedágio (um por sentido). */
const MESMA_PRACA_KM = 1.5;

const ponto = ([lng, lat]: PontoLngLat): GeoPoint => ({ lat, lng });

/**
 * Haversine sem arredondar. O `distanceKm` do socorro arredonda para 10 m, o
 * que é ótimo para "a 1,2 km de você", mas somado em milhares de trechos de
 * poucos metros encurtava a viagem em ~10%.
 */
function km(a: GeoPoint, b: GeoPoint): number {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2
    + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distância acumulada (km) até cada ponto do traçado. */
export function distanciasAcumuladas(geometria: readonly PontoLngLat[]): number[] {
  const acc = [0];
  for (let i = 1; i < geometria.length; i++) acc.push(acc[i - 1] + km(ponto(geometria[i - 1]), ponto(geometria[i])));
  return acc;
}

/** Ponto do traçado no km informado (interpolado no trecho). */
export function pontoNoKm(geometria: readonly PontoLngLat[], acumulado: readonly number[], km: number): GeoPoint {
  const i = acumulado.findIndex((d) => d >= km);
  if (i <= 0) return ponto(geometria[Math.max(0, i)]);
  const [a, b] = [acumulado[i - 1], acumulado[i]];
  const t = b > a ? (km - a) / (b - a) : 0;
  const [p, q] = [geometria[i - 1], geometria[i]];
  return { lng: p[0] + (q[0] - p[0]) * t, lat: p[1] + (q[1] - p[1]) * t };
}

/** Autonomia de um tanque cheio. null quando falta tanque ou consumo. */
export function autonomiaKm(tanqueLitros: number | null | undefined, consumoKmL: number | null | undefined): number | null {
  return tanqueLitros && consumoKmL && tanqueLitros > 0 && consumoKmL > 0 ? tanqueLitros * consumoKmL : null;
}

/**
 * Quilômetros da viagem em que convém abastecer, saindo de tanque cheio: a
 * cada 75% da autonomia. Sem parada se a viagem cabe no tanque.
 */
export function kmDasParadas(distanciaTotalKm: number, autonomia: number | null): number[] {
  if (!autonomia || autonomia <= 0) return [];
  const passo = autonomia * FRACAO_TANQUE_PARADA;
  const kms: number[] = [];
  for (let km = passo; km < distanciaTotalKm - autonomia * (1 - FRACAO_TANQUE_PARADA); km += passo) kms.push(Math.round(km));
  return kms;
}

/** Distância (km) de um ponto ao segmento ab, em projeção local plana (basta para centenas de metros). */
function distanciaAoSegmento(p: GeoPoint, a: GeoPoint, b: GeoPoint): { km: number; t: number } {
  const kx = 111.32 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110.57;
  const [ax, ay, bx, by, px, py] = [a.lng * kx, a.lat * ky, b.lng * kx, b.lat * ky, p.lng * kx, p.lat * ky];
  const [dx, dy] = [bx - ax, by - ay];
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return { km: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t };
}

/** Rumo (0 = norte, 90 = leste) do segmento ab. */
function rumo(a: GeoPoint, b: GeoPoint): number {
  const graus = (Math.atan2((b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180), b.lat - a.lat) * 180) / Math.PI;
  return (graus + 360) % 360;
}

const RUMO_DO_SENTIDO: Record<string, number> = { NORTE: 0, LESTE: 90, SUL: 180, OESTE: 270 };

/**
 * A praça cobra no sentido em que o piloto passa? Só dá para saber nos
 * sentidos cardeais (NORTE, SUL…); "Crescente", "Decrescente" e "AMBOS" ficam
 * como possíveis e a deduplicação por proximidade evita contar ida e volta.
 */
function cobraNesteSentido(sentido: string, rumoDoTrecho: number): boolean {
  const alvo = RUMO_DO_SENTIDO[sentido.trim().toUpperCase()];
  if (alvo === undefined) return true;
  const diferenca = Math.abs(((rumoDoTrecho - alvo + 540) % 360) - 180);
  return diferenca <= 90;
}

/** Onde um ponto cai no traçado: km da viagem e distância até a pista. */
export function projetarNoTracado(geometria: readonly PontoLngLat[], acumulado: readonly number[], p: GeoPoint): { km: number; distanciaKm: number } {
  let melhor = { distanciaKm: Infinity, km: 0 };
  for (let i = 1; i < geometria.length; i++) {
    const d = distanciaAoSegmento(p, ponto(geometria[i - 1]), ponto(geometria[i]));
    if (d.km < melhor.distanciaKm) melhor = { distanciaKm: d.km, km: acumulado[i - 1] + (acumulado[i] - acumulado[i - 1]) * d.t };
  }
  return melhor;
}

/** Pedaço do traçado entre dois km da viagem (para buscar postos ao longo dele). */
export function trechoDoTracado(geometria: readonly PontoLngLat[], acumulado: readonly number[], deKm: number, ateKm: number): PontoLngLat[] {
  const de = pontoNoKm(geometria, acumulado, Math.max(0, deKm));
  const ate = pontoNoKm(geometria, acumulado, ateKm);
  const meio = geometria.filter((_, i) => acumulado[i] > deKm && acumulado[i] < ateKm);
  return [[de.lng, de.lat], ...meio, [ate.lng, ate.lat]];
}

/**
 * Onde procurar posto para uma parada: nos 30 km ANTES do ponto da parada (o
 * ponto já é quando resta ~25% do tanque). Sem posto ali, o trecho anterior.
 */
export const TRECHOS_BUSCA_POSTO_KM = [[30, 0], [60, 30]] as const;
/** Até quantos metros da pista o posto conta como "na estrada". */
export const FAIXA_BUSCA_POSTO_M = 500;

export interface PedagioNoTrajeto {
  praca: PracaPedagio;
  /** Km da viagem em que fica a praça. */
  km: number;
}

/** Praças da tabela que ficam sobre o traçado, no sentido da viagem, em ordem. */
export function pedagiosNoTrajeto(
  geometria: readonly PontoLngLat[],
  pracas: readonly PracaPedagio[],
  acumulado: readonly number[] = distanciasAcumuladas(geometria)
): PedagioNoTrajeto[] {
  if (geometria.length < 2) return [];
  const lats = geometria.map((g) => g[1]);
  const lngs = geometria.map((g) => g[0]);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats) - 0.05, Math.max(...lats) + 0.05, Math.min(...lngs) - 0.05, Math.max(...lngs) + 0.05];

  const achados: PedagioNoTrajeto[] = [];
  for (const praca of pracas) {
    if (praca.lat == null || praca.lng == null) continue;
    if (praca.lat < minLat || praca.lat > maxLat || praca.lng < minLng || praca.lng > maxLng) continue;
    const p = { lat: praca.lat, lng: praca.lng };
    let melhor = { km: Infinity, i: -1, t: 0 };
    for (let i = 1; i < geometria.length; i++) {
      const d = distanciaAoSegmento(p, ponto(geometria[i - 1]), ponto(geometria[i]));
      if (d.km < melhor.km) melhor = { km: d.km, i, t: d.t };
    }
    if (melhor.km > TOLERANCIA_PEDAGIO_KM) continue;
    const [a, b] = [ponto(geometria[melhor.i - 1]), ponto(geometria[melhor.i])];
    if (!cobraNesteSentido(praca.sentido, rumo(a, b))) continue;
    const km = acumulado[melhor.i - 1] + (acumulado[melhor.i] - acumulado[melhor.i - 1]) * melhor.t;
    achados.push({ praca, km });
  }

  // Um pedágio por lugar: a tabela tem uma linha por sentido e às vezes as
  // duas cabines ficam a algumas centenas de metros uma da outra.
  achados.sort((x, y) => x.km - y.km);
  const unicos: PedagioNoTrajeto[] = [];
  for (const a of achados) {
    const ultimo = unicos[unicos.length - 1];
    if (ultimo && a.km - ultimo.km < MESMA_PRACA_KM && ultimo.praca.rodovia === a.praca.rodovia) {
      if (ultimo.praca.situacaoMoto !== 'paga' && a.praca.situacaoMoto === 'paga') unicos[unicos.length - 1] = a;
      continue;
    }
    unicos.push(a);
  }
  return unicos;
}

export interface ResumoPedagios {
  /** Soma das praças em que moto paga e o valor é conhecido. */
  totalMoto: number;
  pagas: number;
  isentas: number;
  aConfirmar: number;
}

export function resumirPedagios(lista: readonly PedagioNoTrajeto[]): ResumoPedagios {
  const r: ResumoPedagios = { totalMoto: 0, pagas: 0, isentas: 0, aConfirmar: 0 };
  for (const { praca } of lista) {
    if (praca.situacaoMoto === 'paga' && praca.motoReais) { r.totalMoto += praca.motoReais; r.pagas++; }
    else if (praca.situacaoMoto === 'isenta') r.isentas++;
    else r.aConfirmar++;
  }
  r.totalMoto = Math.round(r.totalMoto * 100) / 100;
  return r;
}

export type OleoNaViagem =
  | { situacao: 'vencida'; passouKm: number }
  | { situacao: 'na-viagem'; kmDaViagem: number }
  | { situacao: 'depois'; sobraKm: number };

/** Onde a troca de óleo cai em relação à viagem (null sem a próxima troca registrada). */
export function oleoNaViagem(kmAtual: number, proximaTrocaKm: number | null | undefined, distanciaKm: number): OleoNaViagem | null {
  if (proximaTrocaKm == null) return null;
  const faltam = proximaTrocaKm - kmAtual;
  if (faltam <= 0) return { situacao: 'vencida', passouKm: -faltam };
  if (faltam <= distanciaKm) return { situacao: 'na-viagem', kmDaViagem: Math.round(faltam) };
  return { situacao: 'depois', sobraKm: Math.round(faltam - distanciaKm) };
}

export interface CustoViagem {
  distanciaKm: number;
  litros: number | null;
  combustivel: number | null;
  pedagios: number;
  /** Combustível + pedágios conhecidos. null sem consumo ou preço. */
  total: number | null;
}

/** Ida e volta dobra combustível e pedágio (a volta é estimada igual à ida). */
export function custoViagem(distanciaIdaKm: number, consumoKmL: number | null, precoLitro: number | null, pedagiosIda: number, idaVolta: boolean): CustoViagem {
  const f = idaVolta ? 2 : 1;
  const distancia = distanciaIdaKm * f;
  const litros = consumoKmL && consumoKmL > 0 ? distancia / consumoKmL : null;
  const combustivel = litros !== null && precoLitro && precoLitro > 0 ? litros * precoLitro : null;
  const pedagios = pedagiosIda * f;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    distanciaKm: Math.round(distancia),
    litros: litros === null ? null : Math.round(litros * 10) / 10,
    combustivel: combustivel === null ? null : r2(combustivel),
    pedagios: r2(pedagios),
    total: combustivel === null ? null : r2(combustivel + pedagios),
  };
}

/**
 * Link do Google Maps com origem, destino e as paradas (postos recomendados).
 * O app do Maps aceita até 9 paradas; acima disso ficam as primeiras.
 */
export function linkGoogleMapsViagem(origem: GeoPoint, destino: GeoPoint, paradas: readonly GeoPoint[]): string {
  const f = (p: GeoPoint) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const qs = new URLSearchParams({ api: '1', origin: f(origem), destination: f(destino), travelmode: 'driving' });
  if (paradas.length) qs.set('waypoints', paradas.slice(0, 9).map(f).join('|'));
  return `https://www.google.com/maps/dir/?${qs.toString()}`;
}

/** Resposta de /api/viagem. */
export interface RotaViagem {
  distanciaKm: number;
  duracaoH: number;
  /** Traçado simplificado (um ponto a cada ~200 m). */
  geometria: PontoLngLat[];
  paradas: ParadaViagem[];
}

export interface ParadaViagem {
  km: number;
  ponto: GeoPoint;
  /**
   * Posto mais perto da estrada nesse trecho (OpenStreetMap), quando achado.
   * `distanciaKm` é a distância do posto até o traçado: 0,2 é na beira da
   * pista; 8 é desviar para dentro de uma cidade.
   */
  posto: { nome: string; lat: number; lng: number; distanciaKm: number } | null;
}

/** Simplifica o traçado: mantém um ponto a cada `passoKm` (e sempre o último). */
export function simplificarTracado(geometria: readonly PontoLngLat[], passoKm = 0.2): PontoLngLat[] {
  if (geometria.length <= 2) return [...geometria];
  const saida: PontoLngLat[] = [geometria[0]];
  let ultimo = ponto(geometria[0]);
  for (let i = 1; i < geometria.length - 1; i++) {
    const p = ponto(geometria[i]);
    if (km(ultimo, p) >= passoKm) { saida.push(geometria[i]); ultimo = p; }
  }
  saida.push(geometria[geometria.length - 1]);
  return saida;
}
