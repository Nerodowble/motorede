import { createHmac } from 'node:crypto';
import { RoomServiceClient, type ParticipantInfo } from 'livekit-server-sdk';
import { OAuth2Client } from 'google-auth-library';
import { isPluginParticipant } from '@motorede/shared';

/**
 * Peças compartilhadas pelas funções serverless.
 *
 * O prefixo `_` evita que a Vercel exponha este arquivo como endpoint.
 */

export interface VerifiedUser {
  /** `sub` do Google, prefixado. Identificador permanente da pessoa. */
  identity: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

/** E-mails com permissão de circular entre comboios lotados. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyGoogleUser(idToken: string): Promise<VerifiedUser | null> {
  if (!googleClient || !googleClientId) return null;

  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub) return null;

    const email = (payload.email || '').toLowerCase();

    return {
      identity: `g-${payload.sub}`,
      name: payload.name || email || 'Piloto',
      email,
      isAdmin: Boolean(email) && adminEmails().includes(email),
    };
  } catch {
    return null;
  }
}

/**
 * Impressão digital do telefone.
 *
 * Calculada SEMPRE no servidor, com um segredo que nunca sai daqui. O motivo é
 * concreto: existem menos de um bilhão de celulares brasileiros possíveis, então
 * um resumo simples do número seria quebrado por força bruta em minutos. Com a
 * chave secreta, quem interceptar os metadados não consegue voltar ao número.
 *
 * A busca funciona porque aplicamos a mesma transformação no número procurado:
 * quem já conhece o telefone encontra a pessoa, quem não conhece não descobre
 * telefone nenhum.
 */
export function phoneFingerprint(normalizedPhone: string): string | null {
  if (!normalizedPhone) return null;
  const secret = process.env.PHONE_FINGERPRINT_SECRET || process.env.LIVEKIT_API_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(normalizedPhone).digest('hex').slice(0, 32);
}

/** Metadados que viajam junto do participante na sala. */
export interface ParticipantMetadata {
  /** Impressão digital do telefone, para a busca. Nunca o número em si. */
  ph?: string;
  /** true quando entrou usando vaga de administrador. */
  adm?: boolean;
  /** Identificador do plugin, quando o participante é um plugin. */
  plg?: string;
}

export function encodeMetadata(meta: ParticipantMetadata): string {
  return JSON.stringify(meta);
}

export function decodeMetadata(raw: string | undefined): ParticipantMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ParticipantMetadata;
  } catch {
    return {};
  }
}

let cachedClient: RoomServiceClient | null = null;

/**
 * Cliente da API de servidor do LiveKit.
 *
 * É por ele que listamos salas e participantes — o que permite lotação,
 * navegador de comboios e busca sem nenhum banco de dados.
 */
export function roomService(): RoomServiceClient | null {
  if (cachedClient) return cachedClient;

  const url = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return null;

  // A API de servidor fala HTTP, não WebSocket.
  const httpUrl = url.replace(/^ws/, 'http');
  cachedClient = new RoomServiceClient(httpUrl, key, secret);
  return cachedClient;
}

/**
 * Conta quantos são pilotos comuns e quantos estão no total.
 *
 * Plugins não entram em nenhuma das contas: não conversam, então não ocupam
 * vaga. Uma sala só com plugin conta como vazia.
 */
export function countParticipants(participants: ParticipantInfo[]): {
  riders: number;
  total: number;
} {
  let admins = 0;
  let total = 0;
  for (const p of participants) {
    // Pela identidade, que o plugin não consegue trocar (ver isPluginParticipant).
    if (isPluginParticipant(p)) continue;
    total++;
    if (decodeMetadata(p.metadata).adm) admins++;
  }
  return { riders: total - admins, total };
}
