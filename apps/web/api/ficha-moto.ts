import type { IncomingMessage, ServerResponse } from 'node:http';
import { lerMotoConsulta } from '@motorede/shared';
import { storeConfigured } from './_redis.js';
import { consultarFicha } from './_fichaMoto.js';

/**
 * Ficha técnica da moto pesquisada por IA.
 *
 *   POST { marca, modelo, ano }
 *   → 200 { estado: 'pronta', ficha, em } | { estado: 'pendente' } |
 *         { estado: 'sem-dados' } | { estado: 'indisponivel' } | { estado: 'falhou' }
 *   → 400 moto inválida · 429 pesquisas demais deste endereço
 *
 * `pendente`: o app pergunta de novo em alguns segundos. A IA roda num
 * computador de casa e leva de 10 s a 1 min. `indisponivel`: o computador está
 * desligado (ou não há plugin de IA registrado) — o app diz isso, sem inventar.
 *
 * Sem login de propósito: a tela da moto funciona deslogada, e o app manda só
 * marca, modelo e ano — nada da pessoa. O abuso é contido pelo cache (moto
 * repetida não aciona a IA) e pelo limite de pesquisas novas por endereço.
 */

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const pronto = (req as { body?: unknown }).body;
  if (typeof pronto === 'object' && pronto) return pronto as Record<string, unknown>;
  if (typeof pronto === 'string') {
    try {
      return JSON.parse(pronto) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const partes: Buffer[] = [];
  for await (const p of req) partes.push(p as Buffer);
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Na Vercel o endereço real vem no x-forwarded-for; o primeiro é o do aparelho. */
function enderecoDe(req: IncomingMessage): string {
  const encaminhado = req.headers?.['x-forwarded-for'];
  const primeiro = (Array.isArray(encaminhado) ? encaminhado[0] : encaminhado)?.split(',')[0]?.trim();
  return primeiro || req.socket?.remoteAddress || 'desconhecido';
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const responder = (codigo: number, corpo: unknown) => {
    res.statusCode = codigo;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(corpo));
  };

  if (req.method !== 'POST') return responder(405, { error: 'Method Not Allowed' });

  const moto = lerMotoConsulta(await lerCorpo(req));
  if (!moto) return responder(400, { error: 'Informe marca, modelo e ano da moto.' });

  // Sem Redis não há fila nem cache: a pesquisa simplesmente não está disponível.
  if (!storeConfigured()) return responder(200, { estado: 'indisponivel' });

  try {
    const r = await consultarFicha(moto, enderecoDe(req));
    if (r.estado === 'limite') {
      return responder(429, { error: 'Muitas pesquisas seguidas. Tente de novo mais tarde.' });
    }
    return responder(200, r);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return responder(500, { error: `falha na ficha da moto: ${mensagem}` });
  }
}
