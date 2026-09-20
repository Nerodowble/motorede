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

  if (req.method === 'GET') {
    return responder(200, {
      rede: storeConfigured() ? 'ligada' : 'desligada',
      // O navegador precisa desta chave para se inscrever no push. Ela é
      // pública por definição — o par privado fica só no servidor.
      //
      // Servida pela API, não embutida no build: uma variável `VITE_*` é
      // colada no bundle no momento da compilação, e quando falta o Vite
      // escreve `undefined` e a eliminação de código morto apaga o bloco
      // inteiro em silêncio. Foi exatamente assim que o login do Google
      // sumiu do bundle sem nenhum erro aparecer.
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
      // Só o NOME das variáveis, nunca o valor: serve para conferir que a
      // integração da Vercel criou credenciais com um nome que o código acha.
      variaveis: Object.keys(process.env)
        .filter((k) => k.endsWith('_REST_API_URL') || k.endsWith('_REST_API_TOKEN'))
        .sort(),
      // Quem está servindo esta resposta. Sem isto, "as variáveis não chegam"
      // e "o deploy novo não subiu" e "é outro projeto" são indistinguíveis —
      // e a gente fica tentando adivinhar qual dos três é, como já aconteceu.
      build: {
        projeto: process.env.VERCEL_PROJECT_NAME || null,
        ambiente: process.env.VERCEL_ENV || 'fora da Vercel',
        commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
        // Quantas variáveis de qualquer tipo existem: se vier um número baixo
        // demais, o problema não é o nome do prefixo, é que nada foi ligado.
        totalDeVariaveis: Object.keys(process.env).length,
        comPrefixoKv: Object.keys(process.env).filter((k) => k.startsWith('KV_')).sort(),
      },
    });
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return responder(405, { error: 'Use GET para conferir, POST para entrar na rede, DELETE para sair.' });
  }

  if (!storeConfigured()) {
    return responder(503, {
      error: 'Rede de socorro ainda não configurada no servidor.',
      detail:
        'Faltam as credenciais do Redis. Na Vercel: Storage > Upstash Redis. ' +
        'Qualquer prefixo serve, desde que gere *_REST_API_URL e *_REST_API_TOKEN.',
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

    const pushToken = textoCurto(corpo.pushToken, 1024);
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
