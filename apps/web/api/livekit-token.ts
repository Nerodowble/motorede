import { AccessToken } from 'livekit-server-sdk';

/**
 * Emissão de token do LiveKit — versão de produção (função serverless).
 *
 * Espelha o contrato do plugin de desenvolvimento
 * (`vite/livekit-token-plugin.ts`): mesmo corpo de requisição, mesma resposta.
 * O cliente só troca a URL, sem saber qual dos dois está atendendo.
 *
 * O segredo da API nunca chega ao navegador: a assinatura acontece aqui.
 *
 * NOTA SOBRE AUTENTICAÇÃO
 * Hoje qualquer pessoa com o endereço consegue um token para qualquer sala.
 * É aceitável na fase de testes com amigos, e é exatamente o que muda quando
 * o Supabase entrar: verificar quem é o usuário e se ele pode entrar naquele
 * comboio, antes de assinar.
 */

interface TokenRequest {
  room: string;
  identity: string;
  name?: string;
}

/** Aceita apenas o formato de código de sala que o app gera. */
const ROOM_CODE_PATTERN = /^[A-Z0-9-]{3,32}$/i;
const IDENTITY_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

export const config = { runtime: 'nodejs' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    // Falha explícita: sem isso o app conectaria em lugar nenhum e o erro
    // apareceria lá na frente, difícil de rastrear.
    return json({ error: 'servidor de voz não configurado' }, 500);
  }

  let body: TokenRequest;
  try {
    body = (await request.json()) as TokenRequest;
  } catch {
    return json({ error: 'corpo inválido' }, 400);
  }

  const { room, identity, name } = body;

  if (!room || !identity) {
    return json({ error: 'room e identity são obrigatórios' }, 400);
  }

  // Validação de fronteira: esses valores viram parte de um token assinado.
  if (!ROOM_CODE_PATTERN.test(room)) {
    return json({ error: 'código de sala inválido' }, 400);
  }
  if (!IDENTITY_PATTERN.test(identity)) {
    return json({ error: 'identidade inválida' }, 400);
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: (name || identity).slice(0, 64),
      ttl: '1h',
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    });

    return json({ token: await at.toJwt(), url: livekitUrl });
  } catch {
    return json({ error: 'falha ao emitir token' }, 500);
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
