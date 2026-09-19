import type { VercelRequest, VercelResponse } from '@vercel/node';
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
 * ASSINATURA DO HANDLER
 * Usa o formato (req, res) do runtime Node da Vercel. A primeira versão deste
 * arquivo usava o padrão Web (Request/Response), que é do runtime Edge: a
 * função executava, devolvia um Response e ninguém escrevia em `res`, então a
 * requisição ficava pendurada até expirar. O sintoma era o pior tipo de falha
 * — sem erro, sem log, só um tempo de espera infinito.
 *
 * NOTA SOBRE AUTENTICAÇÃO
 * Hoje qualquer pessoa com o endereço consegue um token para qualquer sala.
 * É aceitável na fase de testes com amigos, e é exatamente o que muda quando
 * o Supabase entrar: verificar quem é o usuário e se ele pode entrar naquele
 * comboio, antes de assinar.
 */

interface TokenRequest {
  room?: string;
  identity?: string;
  name?: string;
}

/** Aceita apenas o formato de código de sala que o app gera. */
const ROOM_CODE_PATTERN = /^[A-Z0-9-]{3,32}$/i;
const IDENTITY_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    // Falha explícita: sem isso o app conectaria em lugar nenhum e o erro
    // apareceria lá na frente, difícil de rastrear.
    res.status(500).json({ error: 'servidor de voz não configurado' });
    return;
  }

  // A Vercel já entrega o corpo desserializado quando o content-type é JSON,
  // mas aceita string quando não é — tratamos os dois casos.
  let body: TokenRequest;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
  } catch {
    res.status(400).json({ error: 'corpo inválido' });
    return;
  }

  const { room, identity, name } = body;

  if (!room || !identity) {
    res.status(400).json({ error: 'room e identity são obrigatórios' });
    return;
  }

  // Validação de fronteira: esses valores viram parte de um token assinado.
  if (!ROOM_CODE_PATTERN.test(room)) {
    res.status(400).json({ error: 'código de sala inválido' });
    return;
  }
  if (!IDENTITY_PATTERN.test(identity)) {
    res.status(400).json({ error: 'identidade inválida' });
    return;
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

    res.status(200).json({ token: await at.toJwt(), url: livekitUrl });
  } catch {
    res.status(500).json({ error: 'falha ao emitir token' });
  }
}
