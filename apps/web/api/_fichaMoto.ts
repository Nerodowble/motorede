import { createHash, randomUUID } from 'node:crypto';
import {
  chaveFichaMoto,
  fichaVazia,
  lerRespostaFichaMoto,
  montarPromptFichaMoto,
  type EstadoFicha,
  type FichaMoto,
  type MotoConsulta,
} from '@motorede/shared';
import { redis } from './_redis.js';
import { iaPlugin, type PluginEntry } from './_plugins.js';

/**
 * Ficha da moto pesquisada pelo plugin de IA. O prefixo `_` impede a Vercel
 * de expor isto como endpoint.
 *
 * O computador com a IA está atrás de roteador: o servidor não o chama. O app
 * pede a ficha, o pedido vira uma TAREFA na fila, o plugin a recolhe no
 * `aguardar` (o mesmo dos convites) e devolve o texto com `concluir`. A
 * resposta é validada aqui e guardada por modelo — a segunda pessoa com a
 * mesma moto não chega a acionar a IA.
 *
 *   mr:ficha:<moto>       ficha pronta (ou "a IA não sabe")    180 dias / 1 dia
 *   mr:fichapend:<moto>   já há tarefa na fila para esta moto     5 min
 *   mr:fichaerro:<moto>   a última tentativa falhou                2 min
 *   mr:iaq:<plugin>       fila de tarefas da IA                    2 min
 *   mr:iatar:<tarefa>     a que moto a tarefa se refere            5 min
 *   mr:fichaip:<ip>       pesquisas novas por endereço             1 h
 *
 * `<moto>` é um resumo da chave normalizada (marca|modelo|ano): o texto que o
 * piloto digitou nunca vira nome de chave.
 */

export const FICHA_SEGUNDOS = 180 * 24 * 60 * 60;
/** "A IA não sabe" expira rápido: amanhã ela pode saber. */
export const FICHA_VAZIA_SEGUNDOS = 24 * 60 * 60;
export const FICHA_PENDENTE_SEGUNDOS = 5 * 60;
/** Depois de uma falha, espera um pouco antes de pedir de novo — sem martelar a IA. */
export const FICHA_ERRO_SEGUNDOS = 2 * 60;
export const TAREFA_FILA_SEGUNDOS = 2 * 60;
export const PESQUISAS_POR_IP_HORA = 30;

/** O que o plugin de IA recebe: um prompt pronto. Ele não sabe o que é moto. */
export interface IaTarefa {
  id: string;
  prompt: string;
  em: number;
}

interface RegistroTarefa {
  plugin: string;
  moto: string;
}

interface FichaGuardada {
  ficha: FichaMoto | null;
  em: number;
}

const resumo = (moto: MotoConsulta) =>
  createHash('sha256').update(chaveFichaMoto(moto)).digest('hex').slice(0, 32);

function lerGuardada(bruto: string | null): FichaGuardada | null {
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as FichaGuardada;
  } catch {
    return null;
  }
}

export type ResultadoConsulta = EstadoFicha | { estado: 'limite' };

/**
 * O app pede a ficha. Responde do cache quando dá; senão, deixa a tarefa na
 * fila da IA — se ela estiver no ar. Com o computador desligado não adianta
 * enfileirar: a tarefa expiraria sem ninguém recolher.
 */
export async function consultarFicha(moto: MotoConsulta, ip: string): Promise<ResultadoConsulta> {
  const m = resumo(moto);
  const [guardada, pendente, erro] = await redis<string | null>([
    ['GET', `mr:ficha:${m}`],
    ['GET', `mr:fichapend:${m}`],
    ['GET', `mr:fichaerro:${m}`],
  ]);

  const g = lerGuardada(guardada);
  if (g) return g.ficha ? { estado: 'pronta', ficha: g.ficha, em: g.em } : { estado: 'sem-dados' };
  if (pendente) return { estado: 'pendente' };
  if (erro) return { estado: 'falhou' };

  const plugin = iaPlugin();
  if (!plugin) return { estado: 'indisponivel' };
  const [vivo] = await redis<string | null>([['GET', `mr:plgv:${plugin.id}`]]);
  if (!vivo) return { estado: 'indisponivel' };

  // Só pesquisa nova conta: cada uma ocupa a IA por até um minuto.
  const chaveIp = `mr:fichaip:${createHash('sha256').update(ip).digest('hex').slice(0, 24)}`;
  const [feitas] = await redis<number>([
    ['INCR', chaveIp],
    ['EXPIRE', chaveIp, 60 * 60],
  ]);
  if (Number(feitas) > PESQUISAS_POR_IP_HORA) return { estado: 'limite' };

  const tarefa: IaTarefa = { id: randomUUID(), prompt: montarPromptFichaMoto(moto), em: Date.now() };
  const registro: RegistroTarefa = { plugin: plugin.id, moto: m };
  await redis([
    ['SET', `mr:iatar:${tarefa.id}`, JSON.stringify(registro), 'EX', FICHA_PENDENTE_SEGUNDOS],
    ['SET', `mr:fichapend:${m}`, tarefa.id, 'EX', FICHA_PENDENTE_SEGUNDOS],
    ['RPUSH', `mr:iaq:${plugin.id}`, JSON.stringify(tarefa)],
    ['EXPIRE', `mr:iaq:${plugin.id}`, TAREFA_FILA_SEGUNDOS],
  ]);
  return { estado: 'pendente' };
}

/** O plugin de IA recolhe as tarefas no `aguardar`. */
export async function coletarTarefas(plugin: PluginEntry): Promise<IaTarefa[]> {
  const [brutos] = await redis<string[] | null>([
    ['LRANGE', `mr:iaq:${plugin.id}`, 0, -1],
    ['DEL', `mr:iaq:${plugin.id}`],
  ]);
  const limite = Date.now() - TAREFA_FILA_SEGUNDOS * 1000;
  const tarefas: IaTarefa[] = [];
  for (const bruto of brutos ?? []) {
    try {
      const t = JSON.parse(bruto) as IaTarefa;
      if (t.em >= limite) tarefas.push(t);
    } catch {
      // tarefa corrompida: descarta
    }
  }
  return tarefas;
}

/** Como a conclusão foi recebida — volta para o plugin, que registra no log dele. */
export type ResultadoConclusao = 'guardada' | 'sem-dados' | 'invalida' | 'falhou' | 'desconhecida';

/**
 * O plugin devolve o texto da IA (ou o motivo de não ter conseguido). A
 * validação é toda aqui: o plugin é só um mensageiro, e o que ele manda não é
 * confiável até passar por `lerRespostaFichaMoto`.
 */
export async function concluirTarefa(
  plugin: PluginEntry,
  id: string,
  resposta: string | null
): Promise<ResultadoConclusao> {
  // O id vira parte da chave: só aceita o formato que nós mesmos geramos.
  if (!/^[0-9a-f-]{36}$/.test(id)) return 'desconhecida';
  const [bruto] = await redis<string | null>([['GET', `mr:iatar:${id}`]]);
  let registro: RegistroTarefa | null = null;
  try {
    registro = bruto ? (JSON.parse(bruto) as RegistroTarefa) : null;
  } catch {
    registro = null;
  }
  // Tarefa de outro plugin conta como inexistente.
  if (!registro || registro.plugin !== plugin.id) return 'desconhecida';

  const m = registro.moto;
  const limpar: (string | number)[][] = [
    ['DEL', `mr:iatar:${id}`],
    ['DEL', `mr:fichapend:${m}`],
  ];

  const ficha = resposta ? lerRespostaFichaMoto(resposta) : null;
  if (!ficha) {
    await redis([...limpar, ['SET', `mr:fichaerro:${m}`, '1', 'EX', FICHA_ERRO_SEGUNDOS]]);
    return resposta ? 'invalida' : 'falhou';
  }

  const vazia = fichaVazia(ficha);
  const guardar: FichaGuardada = { ficha: vazia ? null : ficha, em: Date.now() };
  await redis([
    ...limpar,
    ['SET', `mr:ficha:${m}`, JSON.stringify(guardar), 'EX', vazia ? FICHA_VAZIA_SEGUNDOS : FICHA_SEGUNDOS],
  ]);
  return vazia ? 'sem-dados' : 'guardada';
}
