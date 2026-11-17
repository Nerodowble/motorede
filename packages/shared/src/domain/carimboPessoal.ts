import { distanceKm, type GeoPoint } from './sos.js';
import type { MonumentoRotaBiker } from './rotaBiker.js';

/**
 * Carimbo pessoal da Rota Biker (ideia 41 em docs/ideias.md).
 *
 * O piloto registra no app que esteve num monumento: posição de agora, data e
 * uma foto. NÃO é o carimbo oficial do passaporte — é um lembrete dele, para
 * quem esqueceu o passaporte ou quer o registro no celular. A tela tem de
 * dizer isso com todas as letras.
 *
 * Regras decididas pelo piloto (2026-11-17):
 * - Só a localização ATUAL vale: não se escolhe lugar no mapa nem se carimba
 *   depois. É o que impede marcar que foi estando em outro lugar.
 * - Basta estar nas proximidades (RAIO_CARIMBO_PESSOAL_KM), não em cima do
 *   pino: o ponto oficial às vezes fica a mais de 1 km de onde se carimba
 *   (nº 10, Jaguarão). Quem comprova de verdade é a foto.
 *
 * Funções puras: GPS, câmera e gravação ficam com cada cliente.
 */

/** Distância máxima até o pino do monumento. */
export const RAIO_CARIMBO_PESSOAL_KM = 2;

/**
 * Acima disso o GPS ainda está "procurando" (posição por antena ou Wi-Fi) e a
 * distância não quer dizer nada: pedir para esperar em vez de aceitar ou
 * recusar no escuro.
 */
export const PRECISAO_MAXIMA_M = 1000;

/**
 * Foto escolhida da galeria (só no app, enquanto a câmera não está liberada no
 * APK) precisa ter sido tirada há no máximo isto, pela data da própria foto.
 */
export const FOTO_GALERIA_MAX_HORAS = 12;

export interface CarimboPessoal {
  id: string;
  monumento: number;
  /** ISO 8601, momento do carimbo. */
  em: string;
  lat: number;
  lng: number;
  /** Precisão informada pelo GPS, em metros. */
  precisaoM: number | null;
  /** Distância até o pino do monumento no momento do carimbo. */
  distanciaKm: number;
  /** No app, file:// na pasta do app; na web, a chave da foto no IndexedDB. */
  foto: string;
}

export type AvaliacaoCarimbo =
  | { pode: true; distanciaKm: number }
  | { pode: false; motivo: 'longe'; distanciaKm: number }
  | { pode: false; motivo: 'gps-impreciso'; precisaoM: number };

export function avaliarCarimbo(
  monumento: GeoPoint,
  posicao: GeoPoint,
  precisaoM: number | null
): AvaliacaoCarimbo {
  if (precisaoM !== null && precisaoM > PRECISAO_MAXIMA_M) {
    return { pode: false, motivo: 'gps-impreciso', precisaoM };
  }
  const distancia = distanceKm(posicao, monumento);
  return distancia <= RAIO_CARIMBO_PESSOAL_KM
    ? { pode: true, distanciaKm: distancia }
    : { pode: false, motivo: 'longe', distanciaKm: distancia };
}

/** Mensagem para o piloto quando o carimbo não libera. */
export function explicarRecusa(a: Exclude<AvaliacaoCarimbo, { pode: true }>, m: Pick<MonumentoRotaBiker, 'nome'>): string {
  if (a.motivo === 'gps-impreciso') {
    return `O GPS ainda está impreciso (cerca de ${Math.round(a.precisaoM)} m). Espere um pouco em céu aberto e tente de novo.`;
  }
  const km = a.distanciaKm < 10 ? a.distanciaKm.toFixed(1).replace('.', ',') : Math.round(a.distanciaKm).toString();
  return `Você está a ${km} km de ${m.nome}. O carimbo pessoal só vale nas proximidades, até ${RAIO_CARIMBO_PESSOAL_KM} km.`;
}

/**
 * A foto da galeria foi tirada agora há pouco? `dataFoto` vem do EXIF
 * (DateTimeOriginal, "AAAA:MM:DD HH:MM:SS", hora local do aparelho). Sem data,
 * não dá para saber: recusa.
 */
export function fotoRecente(dataFoto: string | null | undefined, agora: Date = new Date()): boolean {
  const m = dataFoto?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return false;
  const [, a, mes, d, h, min, s] = m.map(Number);
  const tirada = new Date(a, mes - 1, d, h, min, s).getTime();
  const horas = (agora.getTime() - tirada) / 3_600_000;
  // Pequena folga para relógio de câmera adiantado.
  return horas >= -0.25 && horas <= FOTO_GALERIA_MAX_HORAS;
}

/** Último carimbo de cada monumento, para mostrar no card. */
export function ultimoCarimboPorMonumento(carimbos: readonly CarimboPessoal[]): Map<number, CarimboPessoal> {
  const mapa = new Map<number, CarimboPessoal>();
  for (const c of carimbos) {
    const atual = mapa.get(c.monumento);
    if (!atual || c.em > atual.em) mapa.set(c.monumento, c);
  }
  return mapa;
}

export const AVISO_CARIMBO_PESSOAL =
  'Carimbo pessoal do MotoRede: um registro seu de que esteve aqui, com foto e local. Não substitui o carimbo oficial do passaporte da Rota Biker.';
