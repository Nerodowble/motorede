import { coarsenLocation, type GeoPoint } from '@motorede/shared';

/**
 * Peças do socorro no servidor. O prefixo `_` impede a Vercel de expor isto
 * como endpoint.
 *
 * O QUE O SERVIDOR GUARDA — E POR QUANTO TEMPO
 *
 * Só o necessário para saber em quais aparelhos tocar:
 *
 *   mr:geo          conjunto com a célula de ~1 km de cada aparelho
 *   mr:tok:<id>     o endereço de push daquele aparelho   (validade 45 min)
 *   mr:req:<id>     para onde devolver a resposta de um pedido (validade 2 h)
 *
 * Não há alerta, conversa, histórico, perfil nem moto. Isso tudo fica no
 * aparelho de quem pediu — o servidor só entrega recados e esquece.
 *
 * Tudo expira sozinho. Quem não abre o app há 45 minutos some da busca e
 * simplesmente deixa de ser chamado, o que também é a resposta certa: não
 * adianta tocar para quem não vai ver.
 */

const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const PRESENCA_SEGUNDOS = 45 * 60;
export const PEDIDO_SEGUNDOS = 2 * 60 * 60;

export function storeConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

/**
 * Executa comandos no Redis pela API REST do Upstash.
 *
 * REST em vez de biblioteca de propósito: a função serverless sobe e morre a
 * cada chamada, e abrir conexão TCP nesse ciclo custa mais que o próprio
 * trabalho. Também evita mais uma dependência no pacote.
 */
async function redis<T = unknown>(comandos: (string | number)[][]): Promise<T[]> {
  if (!REST_URL || !REST_TOKEN) throw new Error('Armazenamento de presença não configurado.');

  const resposta = await fetch(`${REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(comandos),
  });

  if (!resposta.ok) {
    throw new Error(`Redis respondeu ${resposta.status}: ${await resposta.text()}`);
  }

  const corpo = (await resposta.json()) as Array<{ result?: T; error?: string }>;
  const falha = corpo.find((linha) => linha.error);
  if (falha) throw new Error(`Redis: ${falha.error}`);
  return corpo.map((linha) => linha.result as T);
}

/**
 * Anota onde um aparelho está, de forma aproximada.
 *
 * A posição é arredondada AQUI também, não só no cliente. O cliente já manda a
 * célula, mas quem garante isso é código que roda no aparelho de outra pessoa
 * e pode ser trocado. Arredondar de novo custa nada e faz a promessa valer
 * mesmo quando o cliente mente.
 */
export async function registrarPresenca(
  deviceId: string,
  pushToken: string,
  posicao: GeoPoint
): Promise<void> {
  const celula = coarsenLocation(posicao);
  await redis([
    ['GEOADD', 'mr:geo', celula.lng, celula.lat, deviceId],
    ['SET', `mr:tok:${deviceId}`, pushToken, 'EX', PRESENCA_SEGUNDOS],
  ]);
}

export async function esquecerPresenca(deviceId: string): Promise<void> {
  await redis([
    ['ZREM', 'mr:geo', deviceId],
    ['DEL', `mr:tok:${deviceId}`],
  ]);
}

export interface Vizinho {
  deviceId: string;
  pushToken: string;
  distanciaKm: number;
}

/**
 * Quem está dentro do raio e ainda é alcançável.
 *
 * O conjunto de posições não tem validade por item — Redis não oferece isso
 * dentro de um GEO. Quem expira é o endereço de push. Então a ausência do
 * token é o sinal de que aquele aparelho sumiu, e aproveitamos para limpar a
 * entrada morta. A limpeza acontece no uso, sem tarefa agendada e sem nada
 * crescendo em silêncio.
 */
export async function vizinhosNoRaio(
  centro: GeoPoint,
  raioKm: number,
  excluir: string
): Promise<Vizinho[]> {
  const celula = coarsenLocation(centro);

  const [encontrados] = await redis<unknown[]>([
    [
      'GEOSEARCH',
      'mr:geo',
      'FROMLONLAT',
      celula.lng,
      celula.lat,
      'BYRADIUS',
      raioKm,
      'km',
      'ASC',
      'WITHDIST',
      'COUNT',
      500,
    ],
  ]);

  // `WITHDIST` devolve pares `[id, distância]`, mas a forma exata depende de
  // como o serviço serializa a resposta do Redis. Ler as duas formas custa
  // três linhas e evita que um pedido de socorro falhe por causa de um
  // detalhe de formato — a distância é informativa, o id é que importa.
  const candidatos = (encontrados || [])
    .map((linha) =>
      Array.isArray(linha)
        ? { deviceId: String(linha[0]), distanciaKm: Number(linha[1]) || 0 }
        : { deviceId: String(linha), distanciaKm: 0 }
    )
    .filter((c) => c.deviceId && c.deviceId !== excluir);

  if (candidatos.length === 0) return [];

  const [tokens] = await redis<Array<string | null>>([
    ['MGET', ...candidatos.map((c) => `mr:tok:${c.deviceId}`)],
  ]);

  const vivos: Vizinho[] = [];
  const mortos: string[] = [];

  candidatos.forEach((c, i) => {
    const token = tokens?.[i];
    if (token) vivos.push({ ...c, pushToken: token });
    else mortos.push(c.deviceId);
  });

  if (mortos.length > 0) {
    // Não espera: limpar é manutenção, e um pedido de socorro não pode ficar
    // mais lento por causa dela.
    void redis([['ZREM', 'mr:geo', ...mortos]]).catch(() => {});
  }

  return vivos;
}

/** Guarda para onde devolver as respostas de um pedido. Some em 2 horas. */
export async function lembrarPedido(pedidoId: string, pushTokenDoPedinte: string): Promise<void> {
  await redis([['SET', `mr:req:${pedidoId}`, pushTokenDoPedinte, 'EX', PEDIDO_SEGUNDOS]]);
}

export async function tokenDoPedinte(pedidoId: string): Promise<string | null> {
  const [token] = await redis<string | null>([['GET', `mr:req:${pedidoId}`]]);
  return token ?? null;
}

export interface Recado {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  /** Socorro toca alto e fura o "não perturbe"; apoio entre colegas não. */
  urgente: boolean;
}

/**
 * Entrega os recados pelo serviço de push do Expo.
 *
 * Em lotes de 100 porque é o limite da API. Uma entrega que falha não derruba
 * as outras: num pedido de socorro, avisar nove de dez é muito melhor que
 * falhar inteiro porque um token venceu.
 */
export async function enviarPush(recados: Recado[]): Promise<{ enviados: number; falhas: number }> {
  if (recados.length === 0) return { enviados: 0, falhas: 0 };

  let enviados = 0;
  let falhas = 0;

  for (let i = 0; i < recados.length; i += 100) {
    const lote = recados.slice(i, i + 100).map((r) => ({
      to: r.to,
      title: r.title,
      body: r.body,
      data: r.data,
      sound: 'default',
      priority: 'high',
      channelId: r.urgente ? 'socorro' : 'apoio',
      // O Android descarta push acumulado; para socorro isso é inaceitável.
      ttl: r.urgente ? 900 : 3600,
      interruptionLevel: r.urgente ? 'time-sensitive' : 'active',
    }));

    try {
      // Endereço configurável só para conseguir exercitar isto fora da
      // produção; em produção a variável não existe e vale o padrão.
      const destino = process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';
      const resposta = await fetch(destino, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(lote),
      });
      const corpo = (await resposta.json()) as { data?: Array<{ status: string }> };
      for (const item of corpo.data || []) {
        if (item.status === 'ok') enviados++;
        else falhas++;
      }
    } catch {
      falhas += lote.length;
    }
  }

  return { enviados, falhas };
}

/** Rejeita corpo malformado antes de qualquer trabalho. */
export function lerPonto(valor: unknown): GeoPoint | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const { lat, lng } = valor as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function textoCurto(valor: unknown, maximo: number): string {
  return typeof valor === 'string' ? valor.slice(0, maximo).trim() : '';
}
