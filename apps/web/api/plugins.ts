import type { IncomingMessage, ServerResponse } from 'node:http';
import { AccessToken, TokenVerifier } from 'livekit-server-sdk';
import { normalizePairCode, PLUGIN_IDENTITY_PREFIX } from '@motorede/shared';
import { encodeMetadata } from './_livekit.js';
import { storeConfigured } from './_redis.js';
import {
  announceCode,
  checkPluginKey,
  collectInvites,
  consumeInvite,
  findPlugin,
  invitePlugin,
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
 *   entrar     { plugin, chave, sala }    token de uma sala para a qual foi chamado
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

        // Código fora do formato é ignorado, não recusado: o plugin continua
        // recebendo convites dos comboios já pareados.
        const codigo = normalizePairCode(corpo.codigo);
        if (codigo) await announceCode(plugin, codigo);

        const convites = await collectInvites(plugin);
        return responder(200, { convites });
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

      default:
        return responder(400, { error: 'ação desconhecida' });
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return responder(500, { error: `falha nos plugins: ${mensagem}` });
  }
}
