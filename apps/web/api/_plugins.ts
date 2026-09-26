import { createHash, timingSafeEqual } from 'node:crypto';
import { PLUGIN_ID_PATTERN } from '@motorede/shared';
import { redis } from './_redis.js';

/**
 * Registro e convites de plugins. O prefixo `_` impede a Vercel de expor isto
 * como endpoint.
 *
 * REGISTRO
 *
 * Os plugins conhecidos vêm da variável `MOTOREDE_PLUGINS`, um JSON:
 *
 *   [{ "id": "musica", "nome": "Música", "chave": "<segredo longo>",
 *      "salas": ["MEUCOMBOIO"] }]
 *
 * Registrar é feito UMA vez. Em qual comboio o plugin aparece não fica aqui:
 *
 * - PAREAMENTO (o caminho normal): o plugin mostra um código no computador de
 *   quem o opera; alguém digita esse código no app, dentro de um comboio, e o
 *   plugin passa a aparecer para todo mundo daquele comboio. Trocar de
 *   comboio é digitar o código de novo — nada muda na Vercel.
 * - `salas` (opcional): comboios em que o plugin aparece sempre, sem código.
 *
 * Não há banco: registrar um plugin é decisão de quem opera o servidor, não
 * algo que um desconhecido faça por formulário.
 *
 * CONVITES
 *
 * O plugin roda num computador qualquer, atrás de roteador doméstico — não dá
 * para o servidor chamá-lo. Então é ele quem pergunta, de tempos em tempos,
 * "alguém me chamou?". O que fica no Redis, tudo com prazo:
 *
 *   mr:plgv:<id>          plugin está perguntando (vivo)          20 s
 *   mr:plgc:<id>          fila de convites pendentes              60 s
 *   mr:plgok:<id>:<sala>  convite aceito, pode pedir token        120 s
 *   mr:plgcod:<código>    código de pareamento → plugin            90 s
 *   mr:plgcodde:<id>      código atual do plugin (para trocar)     90 s
 *   mr:plgsala:<sala>     plugins pareados com o comboio           12 h
 *   mr:plgtent:<sala>     tentativas de código erradas            10 min
 *
 * O código só vale enquanto o plugin está ligado: ele é renovado a cada
 * pergunta e expira 90 s depois que o computador desliga.
 */

export interface PluginEntry {
  id: string;
  nome: string;
  chave: string;
  salas?: string[];
}

export interface PluginInvite {
  sala: string;
  por: string;
  em: number;
}

export const VIVO_SEGUNDOS = 20;
export const CONVITE_SEGUNDOS = 60;
export const ACEITE_SEGUNDOS = 120;
export const CODIGO_SEGUNDOS = 90;
export const PAREAMENTO_SEGUNDOS = 12 * 60 * 60;
export const TENTATIVAS_JANELA_SEGUNDOS = 10 * 60;
export const TENTATIVAS_MAXIMAS = 8;

/** Lê o registro. Entradas malformadas são descartadas, não derrubam o resto. */
export function pluginRegistry(): PluginEntry[] {
  const raw = process.env.MOTOREDE_PLUGINS;
  if (!raw) return [];
  let lista: unknown;
  try {
    lista = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(lista)) return [];

  return lista.filter((p): p is PluginEntry => {
    if (!p || typeof p !== 'object') return false;
    const e = p as Record<string, unknown>;
    return (
      typeof e.id === 'string' &&
      PLUGIN_ID_PATTERN.test(e.id) &&
      typeof e.nome === 'string' &&
      typeof e.chave === 'string' &&
      // Chave curta é chave adivinhável.
      e.chave.length >= 24 &&
      (e.salas === undefined ||
        (Array.isArray(e.salas) && e.salas.every((s) => typeof s === 'string')))
    );
  });
}

export function findPlugin(id: unknown): PluginEntry | null {
  if (typeof id !== 'string') return null;
  return pluginRegistry().find((p) => p.id === id) ?? null;
}

/** Compara a chave em tempo constante, para não vazar por cronometragem. */
export function checkPluginKey(plugin: PluginEntry, chave: unknown): boolean {
  if (typeof chave !== 'string') return false;
  const a = createHash('sha256').update(plugin.chave).digest();
  const b = createHash('sha256').update(chave).digest();
  return timingSafeEqual(a, b);
}

/** O plugin aparece sempre neste comboio, sem precisar de código? */
export function pluginFixedIn(plugin: PluginEntry, sala: string): boolean {
  const alvo = sala.toUpperCase();
  return (plugin.salas ?? []).some((s) => s.toUpperCase() === alvo);
}

/** Plugins disponíveis num comboio: os fixos e os pareados por código. */
export async function pluginsForRoom(sala: string): Promise<PluginEntry[]> {
  const [pareados] = await redis<string[] | null>([['SMEMBERS', `mr:plgsala:${sala}`]]);
  const ids = new Set(pareados ?? []);
  return pluginRegistry().filter((p) => pluginFixedIn(p, sala) || ids.has(p.id));
}

export async function pluginAllowedIn(plugin: PluginEntry, sala: string): Promise<boolean> {
  if (pluginFixedIn(plugin, sala)) return true;
  const [membro] = await redis<number>([['SISMEMBER', `mr:plgsala:${sala}`, plugin.id]]);
  return membro === 1;
}

/**
 * O plugin anuncia o código que está mostrando. Se trocou (o dono gerou um
 * novo), o antigo deixa de valer na hora — não espera expirar.
 */
export async function announceCode(plugin: PluginEntry, codigo: string): Promise<void> {
  const [anterior] = await redis<string | null>([['GET', `mr:plgcodde:${plugin.id}`]]);
  const comandos: (string | number)[][] = [];
  if (anterior && anterior !== codigo) comandos.push(['DEL', `mr:plgcod:${anterior}`]);
  comandos.push(
    ['SET', `mr:plgcod:${codigo}`, plugin.id, 'EX', CODIGO_SEGUNDOS],
    ['SET', `mr:plgcodde:${plugin.id}`, codigo, 'EX', CODIGO_SEGUNDOS]
  );
  await redis(comandos);
}

export type PairResult =
  | { ok: true; plugin: PluginEntry }
  | { ok: false; motivo: 'tentativas' | 'codigo' };

/**
 * Pareia um comboio com o plugin dono do código.
 *
 * Tentativas erradas contam por comboio: com poucas tentativas e um código que
 * muda quando o dono quer, chutar deixa de ser caminho.
 */
export async function pairRoom(sala: string, codigo: string): Promise<PairResult> {
  const chaveTent = `mr:plgtent:${sala}`;
  const [tentativas] = await redis<string | null>([['GET', chaveTent]]);
  if (Number(tentativas ?? 0) >= TENTATIVAS_MAXIMAS) return { ok: false, motivo: 'tentativas' };

  const [id] = await redis<string | null>([['GET', `mr:plgcod:${codigo}`]]);
  const plugin = id ? findPlugin(id) : null;
  if (!plugin) {
    await redis([
      ['INCR', chaveTent],
      ['EXPIRE', chaveTent, TENTATIVAS_JANELA_SEGUNDOS],
    ]);
    return { ok: false, motivo: 'codigo' };
  }

  await redis([
    ['SADD', `mr:plgsala:${sala}`, plugin.id],
    ['EXPIRE', `mr:plgsala:${sala}`, PAREAMENTO_SEGUNDOS],
  ]);
  return { ok: true, plugin };
}

export async function unpairRoom(sala: string, id: string): Promise<void> {
  await redis([['SREM', `mr:plgsala:${sala}`, id]]);
}

/** Quais plugins estão perguntando por convites agora. */
export async function pluginsOnline(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const [valores] = await redis<(string | null)[]>([
    ['MGET', ...ids.map((id) => `mr:plgv:${id}`)],
  ]);
  return new Set(ids.filter((_, i) => valores?.[i]));
}

export async function invitePlugin(id: string, convite: PluginInvite): Promise<void> {
  await redis([
    ['RPUSH', `mr:plgc:${id}`, JSON.stringify(convite)],
    ['EXPIRE', `mr:plgc:${id}`, CONVITE_SEGUNDOS],
  ]);
}

/**
 * O plugin pergunta: marca que está vivo, recolhe os convites e libera o
 * pedido de token para cada sala convidada.
 */
export async function collectInvites(plugin: PluginEntry): Promise<PluginInvite[]> {
  const [, brutos] = await redis<unknown>([
    ['SET', `mr:plgv:${plugin.id}`, '1', 'EX', VIVO_SEGUNDOS],
    ['LRANGE', `mr:plgc:${plugin.id}`, 0, -1],
    ['DEL', `mr:plgc:${plugin.id}`],
  ]);

  const limite = Date.now() - CONVITE_SEGUNDOS * 1000;
  const vistos = new Set<string>();
  const convites: PluginInvite[] = [];

  for (const bruto of (brutos as string[] | null) ?? []) {
    try {
      const c = JSON.parse(bruto) as PluginInvite;
      // A permissão já foi conferida ao convidar.
      if (c.em < limite || vistos.has(c.sala)) continue;
      vistos.add(c.sala);
      convites.push(c);
    } catch {
      // convite corrompido: descarta
    }
  }

  if (convites.length > 0) {
    await redis(
      convites.map((c) => ['SET', `mr:plgok:${plugin.id}:${c.sala}`, '1', 'EX', ACEITE_SEGUNDOS])
    );
  }
  return convites;
}

/** Consome a liberação: um convite vale uma entrada. */
export async function consumeInvite(id: string, sala: string): Promise<boolean> {
  const [valor] = await redis<string | null>([
    ['GET', `mr:plgok:${id}:${sala}`],
    ['DEL', `mr:plgok:${id}:${sala}`],
  ]);
  return Boolean(valor);
}
