import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AccessToken } from 'livekit-server-sdk';
import { canJoinConvoy, CONVOY_MAX, normalizePhone } from '@motorede/shared';
import {
  countParticipants,
  encodeMetadata,
  phoneFingerprint,
  roomService,
  verifyGoogleUser,
} from './_livekit';

/**
 * Emissão de token do LiveKit.
 *
 * Além de assinar o acesso, é aqui que a lotação do comboio é verificada — no
 * servidor, antes de liberar a entrada. Fazer isso no cliente seria decorativo:
 * bastaria alguém chamar o endpoint direto para furar o limite.
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
  idToken?: string;
  /** Telefone do piloto, só para gerar a impressão digital. Não é guardado. */
  phone?: string;
}

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
    res.status(500).json({ error: 'servidor de voz não configurado' });
    return;
  }

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
  const isAdmin = verified?.isAdmin ?? false;

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

  // Lotação: consulta quem já está na sala antes de assinar.
  const service = roomService();
  if (service) {
    try {
      const participants = await service.listParticipants(room);

      // Reconexão do mesmo piloto não ocupa vaga nova.
      const alreadyIn = participants.some((p) => p.identity === identity);

      if (!alreadyIn) {
        const { riders, total } = countParticipants(participants);
        const decision = canJoinConvoy(riders, total, isAdmin);
        if (!decision.allowed) {
          res.status(409).json({ error: decision.reason, full: true });
          return;
        }
      }
    } catch {
      // Sala inexistente é o caso normal do primeiro a entrar: segue adiante.
      // Uma falha real da API não deve impedir a conversa — o limite é uma
      // regra de qualidade, não de segurança.
    }
  }

  const phone = body.phone ? normalizePhone(body.phone) : '';

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name.slice(0, 64),
      ttl: '1h',
      metadata: encodeMetadata({
        ph: phoneFingerprint(phone) ?? undefined,
        adm: isAdmin || undefined,
      }),
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canUpdateOwnMetadata: false, // metadados são definidos aqui, não pelo cliente
    });

    res.status(200).json({
      token: await at.toJwt(),
      url: livekitUrl,
      authenticated: Boolean(verified),
      isAdmin,
      maxParticipants: CONVOY_MAX,
    });
  } catch {
    res.status(500).json({ error: 'falha ao emitir token' });
  }
}
