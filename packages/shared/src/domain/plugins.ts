/**
 * Plugins de áudio do comboio.
 *
 * Um plugin é um participante a mais na sala que SÓ publica áudio: não ouve
 * ninguém (o token dele sai sem permissão de assinar faixas) e não ocupa vaga
 * de piloto. Roda na infraestrutura de quem o escreveu — se cair, some só a
 * faixa dele; o comboio continua.
 *
 * O MotoRede não hospeda, não escolhe e não inspeciona o que um plugin toca.
 * Ver `docs/plugins.md`.
 */

/** Prefixo da identidade de um plugin na sala. Piloto não pode usá-lo. */
export const PLUGIN_IDENTITY_PREFIX = 'plugin-';

/** Tópico das mensagens de dados entre app e plugin. */
export const PLUGIN_TOPIC = 'motorede.plugin';

/** Identificador de plugin: curto, minúsculo, sem espaço. */
export const PLUGIN_ID_PATTERN = /^[a-z0-9-]{2,32}$/;

/**
 * Código de pareamento: mostrado no painel de quem opera o plugin e digitado
 * no app para vincular o plugin ao comboio atual. Letras e números sem os
 * ambíguos (0/O, 1/I/L), no formato ABC-1234.
 */
export const PLUGIN_PAIR_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const PLUGIN_PAIR_PATTERN = /^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{4}$/;

/** Aceita o que a pessoa digitar ("mus 7k2p", "MUS7K2P") e devolve "MUS-7K2P", ou null. */
export function normalizePairCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const limpo = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpo.length !== 7) return null;
  const codigo = `${limpo.slice(0, 3)}-${limpo.slice(3)}`;
  return PLUGIN_PAIR_PATTERN.test(codigo) ? codigo : null;
}

/** Passo dos botões de volume do plugin (em %). Botão grande, de luva. */
export const PLUGIN_VOLUME_STEP = 10;

/** Comandos que o app manda ao plugin. */
export type PluginCommand =
  | { tipo: 'tocar'; lista: string; item?: number }
  | { tipo: 'pausar' }
  | { tipo: 'continuar' }
  | { tipo: 'pular' }
  | { tipo: 'parar' }
  | { tipo: 'embaralhar'; ligado: boolean }
  | { tipo: 'sair' };

/** Mensagem como trafega: quem mandou vai junto para o aviso "Fulano pulou". */
export interface PluginMessage {
  plugin: string;
  comando: PluginCommand;
}

/**
 * Estado que o plugin publica nos próprios atributos do participante.
 * Atributos do LiveKit são texto; listas vão serializadas em JSON.
 */
export interface PluginState {
  estado: 'tocando' | 'pausado' | 'parado';
  item?: string;
  lista?: string;
  /** Posição do item atual na lista, a partir de 0. */
  indice?: number;
  embaralhar?: boolean;
  listas: { nome: string; itens: number }[];
  /** Títulos da lista atual, na ordem. */
  itens: string[];
  /** Último comando executado, quem mandou (nome) e quando (ms). */
  ultimo?: { por: string; acao: string; em: number };
  /** Identidade de quem chamou o plugin. Pode dispensá-lo, junto com o líder. */
  chamadoPor?: string;
}

export function encodePluginState(state: PluginState): Record<string, string> {
  return {
    estado: state.estado,
    item: state.item ?? '',
    lista: state.lista ?? '',
    indice: state.indice === undefined ? '' : String(state.indice),
    embaralhar: state.embaralhar ? '1' : '',
    listas: JSON.stringify(state.listas),
    itens: JSON.stringify(state.itens),
    ultimo: state.ultimo ? JSON.stringify(state.ultimo) : '',
    chamadoPor: state.chamadoPor ?? '',
  };
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function decodePluginState(attrs: Record<string, string> | undefined): PluginState {
  const a = attrs ?? {};
  const estado = a.estado === 'tocando' || a.estado === 'pausado' ? a.estado : 'parado';
  const indice = a.indice ? Number(a.indice) : undefined;
  return {
    estado,
    item: a.item || undefined,
    lista: a.lista || undefined,
    indice: Number.isInteger(indice) ? indice : undefined,
    embaralhar: a.embaralhar === '1',
    listas: parseJson(a.listas, []),
    itens: parseJson(a.itens, []),
    ultimo: parseJson(a.ultimo, undefined),
    chamadoPor: a.chamadoPor || undefined,
  };
}

/** Valida um comando recebido pela rede. Qualquer coisa fora do formato é descartada. */
export function parsePluginCommand(raw: unknown): PluginCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  switch (c.tipo) {
    case 'tocar':
      if (typeof c.lista !== 'string' || !c.lista) return null;
      if (c.item !== undefined && !(Number.isInteger(c.item) && (c.item as number) >= 0)) {
        return null;
      }
      return { tipo: 'tocar', lista: c.lista, item: c.item as number | undefined };
    case 'embaralhar':
      return { tipo: 'embaralhar', ligado: c.ligado === true };
    case 'pausar':
    case 'continuar':
    case 'pular':
    case 'parar':
    case 'sair':
      return { tipo: c.tipo };
    default:
      return null;
  }
}

/** Id do plugin a partir da identidade na sala, ou null se for piloto. */
export function pluginIdFromIdentity(identity: string): string | null {
  return identity.startsWith(PLUGIN_IDENTITY_PREFIX)
    ? identity.slice(PLUGIN_IDENTITY_PREFIX.length)
    : null;
}

/**
 * Volume em que a faixa do plugin deve tocar neste aparelho (0 a 1).
 *
 * O plugin é tratado como mais um participante: cada pessoa ajusta o volume
 * DELE no próprio aparelho, e ninguém mais é afetado. Não há abaixar
 * automático quando alguém fala — foi tentado e testado: a cada frase o áudio
 * quase sumia, e quem quer mais baixo prefere decidir quanto.
 */
export function pluginPlaybackVolume(volumePercent: number, mutedByMe: boolean): number {
  if (mutedByMe) return 0;
  return Math.min(100, Math.max(0, volumePercent)) / 100;
}
