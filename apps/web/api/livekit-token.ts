import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AccessToken } from 'livekit-server-sdk';
import { OAuth2Client } from 'google-auth-library';

/**
 * Emissão de token do LiveKit — versão de produção (função serverless).
 *
 * Espelha o contrato do plugin de desenvolvimento
 * (`vite/livekit-token-plugin.ts`): mesmo corpo de requisição, mesma resposta.
 * O cliente só troca a URL, sem saber qual dos dois está atendendo.
 *
 * O segredo da API do LiveKit nunca chega ao navegador: a assinatura acontece
 * aqui.
 *
 * IDENTIDADE
 * Quando o cliente envia `idToken` (o token assinado pelo Google), a identidade
 * vem de lá: `sub` para identificar e `name` para exibir. O piloto aparece com
 * o nome real em vez de "Piloto (app)", e ninguém consegue se passar por outro,
 * porque a assinatura é verificada contra as chaves públicas do Google.
 *
 * REQUIRE_AUTH
 * Enquanto o app nativo ainda não tem login, aceitar pedidos sem `idToken`
 * mantém os dois clientes funcionando. Quando o app tiver login, basta definir
 * REQUIRE_AUTH=true nas variáveis de ambiente para fechar a porta — sem novo
 * deploy de código. Um modo de transição explícito é melhor que uma exceção
 * escondida no meio da lógica.
 *
 * ASSINATURA DO HANDLER
 * Usa o formato (req, res) do runtime Node da Vercel. O padrão Web
 * (Request/Response) é do runtime Edge e faz a requisição ficar pendurada até
 * expirar, sem erro e sem log.
 */

interface TokenRequest {
  room?: string;
  identity?: string;
  name?: string;
  /** Token do Google (JWT). Opcional enquanto REQUIRE_AUTH não estiver ligado. */
  idToken?: string;
}

/** Aceita apenas o formato de código de sala que o app gera. */
const ROOM_CODE_PATTERN = /^[A-Z0-9-]{3,32}$/i;
const IDENTITY_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

interface VerifiedUser {
  identity: string;
  name: string;
}

/**
 * Valida o token do Google e extrai quem é a pessoa.
 *
 * Retorna null quando o token é inválido, expirado ou foi emitido para outro
 * aplicativo — a biblioteca confere a assinatura, o emissor e o `aud`.
 */
async function verifyGoogleUser(idToken: string): Promise<VerifiedUser | null> {
  if (!googleClient || !googleClientId) return null;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) return null;

    return {
      // Prefixo para o identificador nunca colidir com os anônimos.
      identity: `g-${payload.sub}`,
      name: payload.name || payload.email || 'Piloto',
    };
  } catch {
    return null;
  }
}

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

  const requireAuth = process.env.REQUIRE_AUTH === 'true';
  const verified = body.idToken ? await verifyGoogleUser(body.idToken) : null;

  if (body.idToken && !verified) {
    res.status(401).json({ error: 'login inválido ou expirado' });
    return;
  }

  if (requireAuth && !verified) {
    res.status(401).json({ error: 'é preciso entrar com o Google' });
    return;
  }

  const room = body.room;

  if (!room) {
    res.status(400).json({ error: 'room é obrigatório' });
    return;
  }

  if (!ROOM_CODE_PATTERN.test(room)) {
    res.status(400).json({ error: 'código de sala inválido' });
    return;
  }

  // Com login, a identidade vem do Google e o cliente não opina — é o que
  // impede alguém de assumir o identificador de outro piloto.
  let identity: string;
  let name: string;

  if (verified) {
    identity = verified.identity;
    name = verified.name;
  } else {
    if (!body.identity || !IDENTITY_PATTERN.test(body.identity)) {
      res.status(400).json({ error: 'identidade inválida' });
      return;
    }
    identity = body.identity;
    name = body.name || body.identity;
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name.slice(0, 64),
      ttl: '1h',
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    });

    res.status(200).json({
      token: await at.toJwt(),
      url: livekitUrl,
      authenticated: Boolean(verified),
    });
  } catch {
    res.status(500).json({ error: 'falha ao emitir token' });
  }
}
