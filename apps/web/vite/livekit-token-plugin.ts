import type { Plugin } from 'vite';
import { AccessToken } from 'livekit-server-sdk';

/**
 * Endpoint de token do LiveKit — APENAS DESENVOLVIMENTO.
 *
 * Entrar numa sala exige um token assinado com o segredo da API. O segredo
 * nunca pode ir para o cliente, então a assinatura precisa acontecer no
 * servidor. Aqui isso roda como middleware do próprio Vite, evitando subir
 * um segundo processo durante o desenvolvimento.
 *
 * Em produção este papel passa para uma Supabase Edge Function, que além de
 * assinar vai verificar quem é o usuário e se ele pode entrar naquela sala.
 * O contrato de request/response é o mesmo, de propósito: o cliente só troca
 * a URL.
 *
 * Este plugin só é carregado no modo dev — nunca entra no bundle de produção.
 */

const DEV_API_KEY = 'devkey';
const DEV_API_SECRET = 'devsecret_local_somente_desenvolvimento';

export interface TokenRequest {
  /** Código da sala do comboio, ex.: "SERRA-88". */
  room: string;
  /** Identificador único do participante. */
  identity: string;
  /** Nome exibido aos outros pilotos. */
  name?: string;
}

export interface TokenResponse {
  token: string;
  url: string;
}

export function livekitTokenPlugin(): Plugin {
  return {
    name: 'motorede-livekit-token',
    apply: 'serve',

    configureServer(server) {
      const apiKey = process.env.LIVEKIT_API_KEY || DEV_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET || DEV_API_SECRET;

      if (!process.env.LIVEKIT_API_KEY) {
        server.config.logger.info(
          '[livekit] usando credenciais de desenvolvimento (defina LIVEKIT_API_KEY/SECRET para trocar)'
        );
      }

      server.middlewares.use('/api/livekit-token', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const body = await readJsonBody(req);
          const { room, identity, name } = body as TokenRequest;

          if (!room || !identity) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'room e identity são obrigatórios' }));
            return;
          }

          const at = new AccessToken(apiKey, apiSecret, {
            identity,
            name: name || identity,
            // Curto de propósito: o cliente renova. Token vazado expira rápido.
            ttl: '1h',
          });

          at.addGrant({
            roomJoin: true,
            room,
            canPublish: true,
            canSubscribe: true,
            // Permite atualizar os próprios metadados (posição no comboio, etc.)
            canUpdateOwnMetadata: true,
          });

          const payload: TokenResponse = {
            token: await at.toJwt(),
            url: resolveLiveKitUrl(req.headers.host),
          };

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        } catch (err) {
          server.config.logger.error(`[livekit] falha ao emitir token: ${String(err)}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'falha ao emitir token' }));
        }
      });
    },
  };
}

/**
 * Descobre a URL do LiveKit que ESTE cliente deve usar.
 *
 * Detalhe que importa: o celular não pode receber "localhost" — precisa do IP
 * da máquina na rede local. Como o navegador já nos diz por qual host ele
 * chegou até o Vite, reaproveitamos esse mesmo host e só trocamos a porta.
 * Assim PC e celular recebem, cada um, o endereço certo, sem configuração.
 */
function resolveLiveKitUrl(host: string | undefined): string {
  if (process.env.LIVEKIT_URL) return process.env.LIVEKIT_URL;

  const hostname = host?.split(':')[0] || 'localhost';
  return `ws://${hostname}:7880`;
}

function readJsonBody(req: { on: (e: string, cb: (c?: unknown) => void) => void }): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
