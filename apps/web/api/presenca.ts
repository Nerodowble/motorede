import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  registrarPresenca,
  esquecerPresenca,
  storeConfigured,
  lerPonto,
  textoCurto,
  PRESENCA_SEGUNDOS,
} from './_sos.js';

/**
 * "Estou por aqui, e este é o meu endereço de push."
 *
 * O aparelho avisa de tempos em tempos onde está, de forma aproximada. É só
 * isso que permite depois decidir em quem tocar quando alguém pede socorro
 * perto — sem isso, não existe "quem está a 10 km".
 *
 * A entrada vence em 45 minutos. Quem não abre o app há mais que isso deixa de
 * ser chamado, e é o certo: não adianta tocar para quem não vai ver. Sair da
 * rede é um DELETE, imediato.
 *
 * O `.js` nos imports não é engano. O Node em ESM exige a extensão do arquivo
 * compilado, e já custou dois ciclos de deploy aqui quando faltou.
 */

interface Corpo {
  deviceId?: unknown;
  pushToken?: unknown;
  position?: unknown;
}

async function lerCorpo(req: IncomingMessage): Promise<Corpo> {
  if (typeof (req as { body?: unknown }).body === 'object' && (req as { body?: unknown }).body) {
    return (req as unknown as { body: Corpo }).body;
  }
  const partes: Buffer[] = [];
  for await (const p of req) partes.push(p as Buffer);
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}') as Corpo;
  } catch {
    return {};
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const responder = (codigo: number, corpo: unknown) => {
    res.statusCode = codigo;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(corpo));
  };

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return responder(405, { error: 'Use POST para entrar na rede ou DELETE para sair.' });
  }

  if (!storeConfigured()) {
    return responder(503, {
      error: 'Rede de socorro ainda não configurada no servidor.',
      detail: 'Faltam UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.',
    });
  }

  const corpo = await lerCorpo(req);
  const deviceId = textoCurto(corpo.deviceId, 64);
  if (!deviceId) return responder(400, { error: 'deviceId é obrigatório.' });

  try {
    if (req.method === 'DELETE') {
      await esquecerPresenca(deviceId);
      return responder(200, { ok: true, presente: false });
    }

    const pushToken = textoCurto(corpo.pushToken, 256);
    const posicao = lerPonto(corpo.position);

    if (!pushToken) return responder(400, { error: 'pushToken é obrigatório.' });
    if (!posicao) return responder(400, { error: 'position precisa ter lat e lng válidos.' });

    await registrarPresenca(deviceId, pushToken, posicao);
    return responder(200, { ok: true, presente: true, expiraEm: PRESENCA_SEGUNDOS });
  } catch (erro) {
    return responder(500, {
      error: 'Não foi possível registrar sua presença.',
      detail: erro instanceof Error ? erro.message : String(erro),
    });
  }
}
