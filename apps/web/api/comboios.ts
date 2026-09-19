import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CONVOY_CAPACITY,
  normalizePhone,
  type ActiveConvoy,
} from '@motorede/shared';
import {
  countParticipants,
  decodeMetadata,
  phoneFingerprint,
  roomService,
  verifyGoogleUser,
} from './_livekit.js';

/**
 * Comboios ativos e busca de piloto por telefone.
 *
 * Nada disso toca banco de dados: a API de servidor do LiveKit já sabe quais
 * salas existem e quem está em cada uma. O dado só importa enquanto a pessoa
 * está conectada — que é exatamente quando alguém quer encontrá-la.
 *
 * A busca compara impressões digitais, nunca telefones. Quem já tem o número
 * encontra a pessoa; quem não tem não descobre número de ninguém, e não existe
 * como listar os telefones do evento.
 */

interface ComboiosRequest {
  idToken?: string;
  /** Telefone a procurar. Opcional: sem ele, apenas lista os comboios. */
  phone?: string;
}

interface SearchHit {
  code: string;
  riders: number;
  total: number;
  isFull: boolean;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const service = roomService();
  if (!service) {
    res.status(500).json({ error: 'servidor de voz não configurado' });
    return;
  }

  let body: ComboiosRequest;
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

  const target = body.phone ? phoneFingerprint(normalizePhone(body.phone)) : null;

  try {
    const rooms = await service.listRooms();
    const convoys: ActiveConvoy[] = [];
    let found: SearchHit | null = null;

    for (const room of rooms) {
      let participants;
      try {
        participants = await service.listParticipants(room.name);
      } catch {
        continue; // sala que sumiu entre a listagem e a consulta
      }

      const { riders, total } = countParticipants(participants);
      if (total === 0) continue; // sala vazia ainda não encerrada

      const convoy: ActiveConvoy = {
        code: room.name,
        riders,
        total,
        isFull: riders >= CONVOY_CAPACITY,
        createdAt: room.creationTime
          ? new Date(Number(room.creationTime) * 1000).toISOString()
          : undefined,
      };
      convoys.push(convoy);

      if (target && !found) {
        const hit = participants.some((p) => decodeMetadata(p.metadata).ph === target);
        if (hit) {
          found = { code: convoy.code, riders, total, isFull: convoy.isFull };
        }
      }
    }

    // Mais cheios primeiro: num evento, é onde a rota já está acontecendo.
    convoys.sort((a, b) => b.total - a.total);

    res.status(200).json({
      convoys,
      found,
      searched: Boolean(target),
      capacity: CONVOY_CAPACITY,
    });
  } catch {
    res.status(500).json({ error: 'falha ao consultar comboios' });
  }
}
