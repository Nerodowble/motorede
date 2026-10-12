import { distanceKm, type GeoPoint } from './sos.js';

export type PavimentoRota = 'asfalto' | 'misto' | 'terra';
export type CurvasRota = 'baixo' | 'medio' | 'alto';
export interface LocalRota extends GeoPoint { cidade: string }
export interface PedagioRota {
  nome: string;
  valorMoto: number;
  sistema: 'fisica' | 'free_flow';
  fonte?: string;
}
export interface PontoApoioRota extends GeoPoint {
  nome: string;
  tipo: string;
  descricao: string;
}

/** Contrato independente de mapa, pronto para receber a curadoria externa. */
export interface RotaCatalogo {
  id: string;
  nome: string;
  regiao: string;
  inicio: LocalRota;
  fim: LocalRota;
  distanciaKm: number;
  pavimento: PavimentoRota;
  curvas: CurvasRota;
  trechoSemPostoKm: number;
  pedagioIda: number | null;
  pedagios?: PedagioRota[];
  pontosApoio: PontoApoioRota[];
  revisao?: string;
  descricao?: string;
  dificuldade?: string;
  melhorEpoca?: string;
  observacoes: string[];
  fontes: string[];
  restricaoMoto?: { motivo: string; fonte: string };
}

export const ROTULOS_PAVIMENTO: Record<PavimentoRota, string> = {
  asfalto: 'Asfalto', misto: 'Misto', terra: 'Terra',
};
export const ROTULOS_CURVAS: Record<CurvasRota, string> = {
  baixo: 'Poucas curvas', medio: 'Curvas moderadas', alto: 'Muitas curvas',
};
export const AVISO_CATALOGO_ROTAS =
  'Informações ainda não revisadas pelo MotoRede. Distâncias, acessos, pontos de apoio e tarifas podem ter mudado.';
export const AVISO_CUSTO_ROTAS =
  'Estimativa apenas do trecho cadastrado. Não inclui deslocamento até o início, outros pedágios ou desvios. Ida e volta considera o mesmo trecho nos dois sentidos; confirme acessos e tarifas.';
export const AVISO_NAVEGACAO_ROTAS =
  'O navegador calcula o percurso entre os pontos e pode escolher outra estrada. Confira o trajeto e as condições de acesso antes de sair.';

/** Não transforma campo vazio, NaN ou consumo inválido em viagem gratuita. */
export function lerNumeroRota(texto: string): number | null {
  const valor = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(valor)) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export function estimarCustoRota(
  rota: RotaCatalogo,
  consumoKmL: number | null,
  precoLitro: number | null,
  idaVolta: boolean,
  orcamento: number | null = null,
  autonomiaKm: number | null = null,
) {
  const fator = idaVolta ? 2 : 1;
  const distancia = rota.distanciaKm * fator;
  const consumoValido = consumoKmL !== null && Number.isFinite(consumoKmL) && consumoKmL > 0;
  const precoValido = precoLitro !== null && Number.isFinite(precoLitro) && precoLitro > 0;
  const finito = (valor: number) => Number.isFinite(valor) && valor >= 0 ? valor : null;
  const litros = consumoValido ? finito(distancia / consumoKmL) : null;
  const combustivel = litros !== null && precoValido ? finito(litros * precoLitro) : null;
  const pedagios = rota.pedagioIda !== null ? finito(rota.pedagioIda * fator) : null;
  const total = combustivel !== null && pedagios !== null ? finito(combustivel + pedagios) : null;
  return {
    distancia, litros, combustivel, pedagios, total,
    acimaOrcamento: total !== null && orcamento !== null && orcamento > 0 && total > orcamento,
    alertaAutonomia: autonomiaKm !== null && autonomiaKm > 0 && rota.trechoSemPostoKm > autonomiaKm,
  };
}

export interface FiltrosRotas {
  busca?: string;
  pavimento?: PavimentoRota | '';
  curvas?: CurvasRota | '';
  origem?: GeoPoint | null;
  regiao?: string;
  extensao?: '' | 'curta' | 'media' | 'longa';
  ordem?: 'nome' | 'extensao' | 'proximidade';
}

export const TAMANHO_LOTE_ROTAS = 20;
export const CHAVE_ROTAS_SALVAS = 'motorede_saved_routes';
export const ROTULOS_EXTENSAO = { curta: 'Até 100 km', media: 'Mais de 100 até 300 km', longa: 'Acima de 300 km' } as const;

/** IDs locais, sem depender da versão atual do catálogo. */
export function lerRotasSalvas(raw: string | null): string[] {
  if (!raw) return [];
  const valor: unknown = JSON.parse(raw);
  if (!Array.isArray(valor) || valor.some((id) => typeof id !== 'string')) {
    throw new Error('Formato de rotas salvas inválido.');
  }
  return [...new Set(valor as string[])];
}

export function alternarRotaSalva(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((salvo) => salvo !== id) : [...ids, id];
}
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
export function buscarRotas(catalogo: readonly RotaCatalogo[], filtros: FiltrosRotas) {
  const busca = normalizar(filtros.busca?.trim() ?? '');
  return catalogo.filter((rota) =>
    (!busca || normalizar(`${rota.nome} ${rota.regiao} ${rota.inicio.cidade} ${rota.fim.cidade}`).includes(busca)) &&
    (!filtros.regiao || rota.regiao === filtros.regiao) &&
    (!filtros.extensao || (filtros.extensao === 'curta' ? rota.distanciaKm <= 100
      : filtros.extensao === 'media' ? rota.distanciaKm > 100 && rota.distanciaKm <= 300 : rota.distanciaKm > 300)) &&
    (!filtros.pavimento || rota.pavimento === filtros.pavimento) &&
    (!filtros.curvas || rota.curvas === filtros.curvas)
  ).map((rota) => ({
    rota,
    distanciaInicioKm: filtros.origem ? distanceKm(filtros.origem, rota.inicio) : null,
  })).sort((a, b) => {
    const ordem = filtros.ordem ?? (filtros.origem ? 'proximidade' : 'nome');
    if (ordem === 'extensao' && a.rota.distanciaKm !== b.rota.distanciaKm) return a.rota.distanciaKm - b.rota.distanciaKm;
    if (ordem === 'proximidade' && a.distanciaInicioKm !== null && b.distanciaInicioKm !== null
      && a.distanciaInicioKm !== b.distanciaInicioKm) return a.distanciaInicioKm - b.distanciaInicioKm;
    return a.rota.nome.localeCompare(b.rota.nome, 'pt-BR');
  });
}

export function formatarReaisRota(valor: number | null): string {
  return valor === null || !Number.isFinite(valor) ? 'Não calculado' : `R$ ${valor.toFixed(2).replace('.', ',')}`;
}
export function fonteRotaSegura(url: string): boolean {
  return /^https:\/\/[^\s]+$/i.test(url);
}
const coordenada = (ponto: GeoPoint) => encodeURIComponent(`${ponto.lat},${ponto.lng}`);

/** A viagem usa o início como parada e o fim como destino. O Maps resolve a origem atual. */
export function linksNavegacaoRota(rota: RotaCatalogo) {
  const inicio = coordenada(rota.inicio);
  return {
    googleViagem: rota.restricaoMoto ? null : `https://www.google.com/maps/dir/?api=1&destination=${coordenada(rota.fim)}&waypoints=${inicio}&travelmode=driving`,
    googleInicio: `https://www.google.com/maps/dir/?api=1&destination=${inicio}&travelmode=driving&dir_action=navigate`,
    wazeInicio: `https://waze.com/ul?ll=${inicio}&navigate=yes`,
    googleTrecho: rota.restricaoMoto ? null : `https://www.google.com/maps/dir/?api=1&origin=${inicio}&destination=${coordenada(rota.fim)}&travelmode=driving`,
  };
}
