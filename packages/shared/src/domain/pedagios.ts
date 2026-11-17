/**
 * Praças de pedágio, para o custo da viagem (ideia 40 em docs/ideias.md).
 *
 * A tabela é levantada à mão (com ajuda de IA) a partir de fonte oficial:
 * site da concessionária, ANTT ou ARTESP. Cada praça guarda a fonte e a data
 * da consulta, porque tarifa muda pelo menos uma vez por ano e um valor velho
 * apresentado como atual é pior que valor nenhum.
 *
 * Nada aqui é deduzido de "moto paga metade do carro": quando a fonte não
 * publica o valor de moto, `motoReais` fica null e a tela deve dizer "valor a
 * confirmar", nunca inventar.
 */

/**
 * - `paga`: a fonte publica o valor para moto.
 * - `isenta`: a fonte oficial diz que moto não paga.
 * - `isenta-inferida`: nenhuma fonte diz com todas as letras, mas a tabela
 *   oficial não tem categoria moto e o volume pago da ARTESP registra zero
 *   motos. Mostrar como isenta, com ressalva.
 * - `desconhecida`: não foi possível ler a tabela oficial.
 */
export type SituacaoMotoPedagio = 'paga' | 'isenta' | 'isenta-inferida' | 'desconhecida';

export interface PracaPedagio {
  /** Estável entre atualizações da tabela: uf-lote-praça-sentido. */
  id: string;
  uf: string;
  /** Lote ARTESP (ex.: "L01") ou "FEDERAL". */
  lote: string;
  concessionaria: string;
  nome: string;
  rodovia: string | null;
  km: number | null;
  /** Sentido cobrado, como a fonte escreve (NORTE, SUL, Crescente…). */
  sentido: string;
  municipio: string | null;
  lat: number | null;
  lng: number | null;
  cobranca: 'cabine' | 'free-flow';
  situacaoMoto: SituacaoMotoPedagio;
  /** Valor para moto em reais. 0 quando isenta; null quando desconhecido. */
  motoReais: number | null;
  /** Carro de passeio (categoria 1), só para conferência. */
  carroReais: number | null;
  /** AAAA-MM-DD, quando a fonte informa. */
  vigenciaDesde: string | null;
  fonte: string | null;
  consultadoEm: string;
  observacao?: string;
}

/** Formato de /dados/pedagios-<uf>.json, servido pela web. */
export interface TabelaPedagios {
  uf: string;
  geradoPor: string;
  /** Data da consulta mais recente (AAAA-MM-DD). */
  consultadoAte: string;
  total: number;
  pracas: PracaPedagio[];
}

/** Caminho da tabela na web; o app soma ao endereço da web. */
export const CAMINHO_PEDAGIOS_SP = '/dados/pedagios-sp.json';
