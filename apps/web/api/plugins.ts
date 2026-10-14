import type { IncomingMessage, ServerResponse } from 'node:http';
import { AccessToken, TokenVerifier } from 'livekit-server-sdk';
import { normalizePairCode, PLUGIN_IDENTITY_PREFIX } from '@motorede/shared';
import { encodeMetadata } from './_livekit.js';
import { storeConfigured } from './_redis.js';
import { coletarTarefas, concluirTarefa } from './_fichaMoto.js';
import { acordarPlugin } from './_acordar.js';
import {
  announceCode,
  checkPluginKey,
  collectInvites,
  consumeInvite,
  findPlugin,
  invitePlugin,
  markAlive,
  markOffline,
  pairRoom,
  pluginAllowedIn,
  pluginsForRoom,
  pluginsOnline,
  unpairRoom,
} from './_plugins.js';

/**
 * Plugins de áudio: descobrir, chamar e entrar.
 *
 * Dois lados falam com este endpoint:
 *
 * O APP, com o token do LiveKit que já tem em mãos. Ele prova que a pessoa
 * está naquela sala — só quem está no comboio lista ou chama plugin para ele.
 *
 *   listar     { token }                  plugins disponíveis para a sala
 *   parear     { token, codigo }          vincula a sala ao plugin dono do código
 *   desparear  { token, plugin }          desfaz o vínculo
 *   convidar   { token, plugin }          põe um convite na fila do plugin
 *
 * O PLUGIN, com a chave do registro (`MOTOREDE_PLUGINS`).
 *
 *   aguardar   { plugin, chave, codigo? } "alguém me chamou?" (e anuncia o código)
 *   desligar   { plugin, chave }          vai desligar: sai da lista na hora
 *   entrar     { plugin, chave, sala }    token de uma sala para a qual foi chamado
 *   concluir   { plugin, chave, id, resposta? }  só o plugin de IA: devolve uma tarefa
 *
 * O plugin não pergunta em intervalo curto: fica parado até ser acordado
 * (`_acordar.ts`) ao receber convite ou tarefa. Ver `_plugins.ts`.
 *
 * O plugin de IA (`"tipo": "ia"`) recebe `tarefas` no `aguardar`, em vez de
 * convites, e nunca entra em sala. Ver `_fichaMoto.ts` e docs/plugins.md.
 *
 * O token do plugin sai SEM permissão de assinar faixas: ele publica áudio mas
 * não ouve o comboio. Sem isso, qualquer plugin viraria escuta da conversa de
 * todo mundo — e quem garante a regra é o servidor, não o código do plugin.
 */

interface Corpo {
  acao?: unknown;
  token?: unknown;
  plugin?: unknown;
  chave?: unknown;
  sala?: unknown;
  codigo?: unknown;
  id?: unknown;
  resposta?: unknown;
}

async function lerCorpo(req: IncomingMessage): Promise<Corpo> {
  const pronto = (req as { body?: unknown }).body;
  if (typeof pronto === 'object' && pronto) return pronto as Corpo;
  if (typeof pronto === 'string') {
    try {
      return JSON.parse(pronto) as Corpo;
    } catch {
      return {};
    }
  }
  const partes: Buffer[] = [];
  for await (const p of req) partes.push(p as Buffer);
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}') as Corpo;
  } catch {
    return {};
  }
}

/** Quem está pedindo, lido do token do LiveKit que o app recebeu ao entrar. */
async function piloto(
  token: unknown,
  apiKey: string,
  apiSecret: string
): Promise<{ sala: string; identidade: string; nome: string } | null> {
  if (typeof token !== 'string' || token.length > 4096) return null;
  try {
    const claims = await new TokenVerifier(apiKey, apiSecret).verify(token);
    const sala = claims.video?.room;
    const identidade = claims.sub;
    if (!sala || !identidade || !claims.video?.roomJoin) return null;
    // Plugin não chama plugin.
    if (identidade.startsWith(PLUGIN_IDENTITY_PREFIX)) return null;
    return { sala, identidade, nome: claims.name || identidade };
  } catch {
    return null;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const responder = (codigo: number, corpo: unknown) => {
    res.statusCode = codigo;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(corpo));
  };

  if (req.method !== 'POST') return responder(405, { error: 'Method Not Allowed' });

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) {
    return responder(500, { error: 'servidor de voz não configurado' });
  }

  const corpo = await lerCorpo(req);

  try {
    switch (corpo.acao) {
      case 'listar': {
        const quem = await piloto(corpo.token, apiKey, apiSecret);
        if (!quem) return responder(401, { error: 'token de sala inválido' });

        // Sem Redis não há pareamento nem convite: nada a oferecer.
        if (!storeConfigured()) return responder(200, { plugins: [] });
        const disponiveis = await pluginsForRoom(quem.sala);
        const online = await pluginsOnline(disponiveis.map((p) => p.id));

        return responder(200, {
          plugins: disponiveis.map((p) => ({
            id: p.id,
            nome: p.nome,
            identidade: `${PLUGIN_IDENTITY_PREFIX}${p.id}`,
            online: online.has(p.id),
          })),
        });
      }

      case 'convidar': {
        const quem = await piloto(corpo.token, apiKey, apiSecret);
        if (!quem) return responder(401, { error: 'token de sala inválido' });
        if (!storeConfigured()) return responder(503, { error: 'convites não configurados' });

        const plugin = findPlugin(corpo.plugin);
        if (!plugin || !(await pluginAllowedIn(plugin, quem.sala))) {
          return responder(404, { error: 'plugin indisponível neste comboio' });
        }

        await invitePlugin(plugin.id, { sala: quem.sala, por: quem.identidade, em: Date.now() });
        await acordarPlugin(plugin);
        return responder(202, { ok: true });
      }

      case 'parear': {
        const quem = await piloto(corpo.token, apiKey, apiSecret);
        if (!quem) return responder(401, { error: 'token de sala inválido' });
        if (!storeConfigured()) return responder(503, { error: 'pareamento não configurado' });

        const codigo = normalizePairCode(corpo.codigo);
        if (!codigo) return responder(400, { error: 'Código inválido. Ele tem o formato ABC-1234.' });

        const resultado = await pairRoom(quem.sala, codigo);
        if (!resultado.ok) {
          return resultado.motivo === 'tentativas'
            ? responder(429, { error: 'Muitas tentativas erradas neste comboio. Espere uns minutos.' })
            : responder(404, {
                error: 'Código não encontrado. Confira o código e se o computador com o plugin está ligado.',
              });
        }
        const p = resultado.plugin;
        return responder(200, {
          plugin: { id: p.id, nome: p.nome, identidade: `${PLUGIN_IDENTITY_PREFIX}${p.id}`, online: true },
        });
      }

      case 'desparear': {
        const quem = await piloto(corpo.token, apiKey, apiSecret);
        if (!quem) return responder(401, { error: 'token de sala inválido' });
        const plugin = findPlugin(corpo.plugin);
        if (!plugin) return responder(404, { error: 'plugin desconhecido' });
        if (storeConfigured()) await unpairRoom(quem.sala, plugin.id);
        return responder(200, { ok: true });
      }

      case 'aguardar': {
        const plugin = findPlugin(corpo.plugin);
        if (!plugin || !checkPluginKey(plugin, corpo.chave)) {
          return responder(401, { error: 'plugin ou chave inválidos' });
        }
        if (!storeConfigured()) return responder(503, { error: 'convites não configurados' });

        // A IA não pareia nem entra em comboio: só recolhe tarefas.
        if (plugin.tipo === 'ia') {
          await markAlive(plugin);
          return responder(200, { convites: [], tarefas: await coletarTarefas(plugin) });
        }

        // Código fora do formato é ignorado, não recusado: o plugin continua
        // recebendo convites dos comboios já pareados.
        const codigo = normalizePairCode(corpo.codigo);
        if (codigo) await announceCode(plugin, codigo);

        const convites = await collectInvites(plugin);
        return responder(200, { convites });
      }

      case 'desligar': {
        const plugin = findPlugin(corpo.plugin);
        if (!plugin || !checkPluginKey(plugin, corpo.chave)) {
          return responder(401, { error: 'plugin ou chave inválidos' });
        }
        if (storeConfigured()) await markOffline(plugin);
        return responder(200, { ok: true });
      }

      case 'entrar': {
        const plugin = findPlugin(corpo.plugin);
        if (!plugin || !checkPluginKey(plugin, corpo.chave)) {
          return responder(401, { error: 'plugin ou chave inválidos' });
        }
        const sala = typeof corpo.sala === 'string' ? corpo.sala : '';
        if (!sala || !storeConfigured() || !(await pluginAllowedIn(plugin, sala))) {
          return responder(403, { error: 'sala não permitida para este plugin' });
        }
        // Plugin só entra onde foi chamado. Sem convite, não há token.
        if (!(await consumeInvite(plugin.id, sala))) {
          return responder(403, { error: 'ninguém chamou este plugin para esta sala' });
        }

        const at = new AccessToken(apiKey, apiSecret, {
          identity: `${PLUGIN_IDENTITY_PREFIX}${plugin.id}`,
          name: plugin.nome.slice(0, 64),
          ttl: '6h',
          metadata: encodeMetadata({ plg: plugin.id }),
        });
        at.addGrant({
          roomJoin: true,
          room: sala,
          canPublish: true,
          canSubscribe: false, // publica, mas não ouve o comboio
          canPublishData: false, // estado vai pelos atributos
          canUpdateOwnMetadata: true, // necessário para publicar os atributos
        });

        return responder(200, { token: await at.toJwt(), url: livekitUrl });
      }

      case 'concluir': {
        const plugin = findPlugin(corpo.plugin);
        if (!plugin || !checkPluginKey(plugin, corpo.chave)) {
          return responder(401, { error: 'plugin ou chave inválidos' });
        }
        if (plugin.tipo !== 'ia') return responder(403, { error: 'só o plugin de IA conclui tarefas' });
        if (!storeConfigured()) return responder(503, { error: 'tarefas não configuradas' });
        if (typeof corpo.id !== 'string') return responder(400, { error: 'falta o id da tarefa' });

        // Sem resposta (ou vazia) = a IA falhou. Texto enorme é cortado: ficha cabe em pouco.
        const resposta =
          typeof corpo.resposta === 'string' && corpo.resposta.trim() ? corpo.resposta.slice(0, 20_000) : null;
        const resultado = await concluirTarefa(plugin, corpo.id, resposta);
        if (resultado === 'desconhecida') {
          return responder(404, { error: 'tarefa não encontrada ou expirada' });
        }
        return responder(200, { resultado });
      }

      default:
        return responder(400, { error: 'ação desconhecida' });
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return responder(500, { error: `falha nos plugins: ${mensagem}` });
  }
}
