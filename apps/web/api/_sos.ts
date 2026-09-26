import { coarsenLocation, type GeoPoint } from '@motorede/shared';
import { redis, storeConfigured } from './_redis.js';

export { storeConfigured };

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

export const PRESENCA_SEGUNDOS = 45 * 60;
export const PEDIDO_SEGUNDOS = 2 * 60 * 60;

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

/**
 * O pedido em aberto, para quem chegar depois.
 *
 * POR QUE ISTO EXISTE
 *
 * Antes o pedido era só um push: saía para quem estava no raio naquele
 * segundo e acabava ali. Quem abrisse o app um minuto depois não via nada, e
 * não havia lista para consultar. Para um socorro isso é o erro inteiro —
 * quem está parado no acostamento precisa ser achado por quem aparecer na
 * próxima meia hora, não só por quem por acaso estava com o telefone na mão.
 *
 * O que fica guardado é exatamente o que já viajava dentro da notificação: a
 * célula de ~1 km, o texto e o nome. Endereço exato, telefone e conversa
 * continuam fora daqui. E vence em 2 horas: um pedido velho na lista é pior
 * que nenhum, porque manda gente rodar atrás de quem já foi embora.
 */
export interface PedidoAberto {
  pedidoId: string;
  /** Quem abriu. Serve para não devolver o próprio pedido a quem o criou. */
  de?: string;
  kind: 'emergencia' | 'apoio';
  emergency?: string;
  nome: string;
  moto?: string;
  referencia: string;
  detalhes?: string;
  celula: GeoPoint;
  raioKm: number;
  em: string;
}

export async function guardarPedido(pedido: PedidoAberto): Promise<void> {
  await redis([
    ['GEOADD', 'mr:pedidos', pedido.celula.lng, pedido.celula.lat, pedido.pedidoId],
    ['SET', `mr:ped:${pedido.pedidoId}`, JSON.stringify(pedido), 'EX', PEDIDO_SEGUNDOS],
  ]);
}

/**
 * Pedidos ainda abertos perto de um ponto.
 *
 * Mesma limpeza-durante-o-uso da presença: o conjunto geográfico não tem
 * validade por item, então o desaparecimento do corpo do pedido é o sinal de
 * que ele venceu, e a entrada morta sai durante a própria consulta.
 */
export async function pedidosNoRaio(
  centro: GeoPoint,
  raioKm: number,
  excluir?: string
): Promise<PedidoAberto[]> {
  const celula = coarsenLocation(centro);

  const [achados] = await redis<unknown[]>([
    [
      'GEOSEARCH',
      'mr:pedidos',
      'FROMLONLAT',
      celula.lng,
      celula.lat,
      'BYRADIUS',
      raioKm,
      'km',
      'ASC',
      'COUNT',
      100,
    ],
  ]);

  const ids = (achados || []).map((l) => (Array.isArray(l) ? String(l[0]) : String(l))).filter(Boolean);
  if (ids.length === 0) return [];

  const [corpos] = await redis<Array<string | null>>([
    ['MGET', ...ids.map((id) => `mr:ped:${id}`)],
  ]);

  const abertos: PedidoAberto[] = [];
  const mortos: string[] = [];

  ids.forEach((id, i) => {
    const bruto = corpos?.[i];
    if (!bruto) {
      mortos.push(id);
      return;
    }
    try {
      abertos.push(JSON.parse(bruto) as PedidoAberto);
    } catch {
      mortos.push(id);
    }
  });

  if (mortos.length > 0) void redis([['ZREM', 'mr:pedidos', ...mortos]]).catch(() => {});

  // Ver o próprio pedido na lista de "quem precisa de ajuda perto de você"
  // faria a pessoa achar que há outra pessoa parada na mesma estrada.
  return excluir ? abertos.filter((p) => p.de !== excluir) : abertos;
}

/** Tira o pedido da lista assim que ele é resolvido ou cancelado. */
export async function encerrarPedido(pedidoId: string): Promise<void> {
  await redis([
    ['ZREM', 'mr:pedidos', pedidoId],
    ['DEL', `mr:ped:${pedidoId}`],
    ['DEL', `mr:req:${pedidoId}`],
    ['DEL', `mr:of:${pedidoId}`],
  ]);
}

/** Quem abriu o pedido. Usado para conferir quem tem direito de aceitar. */
export async function donoDoPedido(pedidoId: string): Promise<string | null> {
  const [bruto] = await redis<string | null>([['GET', `mr:ped:${pedidoId}`]]);
  if (!bruto) return null;
  try {
    return (JSON.parse(bruto) as PedidoAberto).de ?? null;
  } catch {
    return null;
  }
}

/**
 * Quem se ofereceu para ajudar num pedido.
 *
 * Guardado por um motivo só: para o servidor saber em QUAL aparelho tocar
 * quando quem pediu aceitar alguém. Sem isso, "aceitar" não teria como
 * alcançar a pessoa escolhida — e o endereço exato nunca sairia do aparelho de
 * quem pediu, que é justamente o que a tela promete que vai acontecer.
 */
export interface Oferta {
  ofertaId: string;
  nome: string;
  moto?: string;
  /** Para onde mandar o endereço exato, se for aceito. */
  pushToken: string;
  celula: GeoPoint | null;
  em: string;
}

export async function guardarOferta(pedidoId: string, oferta: Oferta): Promise<void> {
  await redis([
    ['RPUSH', `mr:of:${pedidoId}`, JSON.stringify(oferta)],
    ['EXPIRE', `mr:of:${pedidoId}`, PEDIDO_SEGUNDOS],
  ]);
}

/**
 * Todas as ofertas de um pedido.
 *
 * Existe pelo mesmo motivo da lista de pedidos abertos: o push pode falhar,
 * chegar com o app fechado, ou ser dispensado sem querer. Sem esta consulta,
 * quem pediu socorro nunca ficaria sabendo que alguém se ofereceu — e a ajuda
 * estaria a caminho sem ninguém do outro lado conseguir liberar o endereço.
 *
 * O `pushToken` NÃO sai daqui: ele é o endereço de entrega de outra pessoa, e
 * quem pediu não precisa dele para nada.
 */
export async function ofertasDoPedido(pedidoId: string): Promise<Omit<Oferta, 'pushToken'>[]> {
  const [lista] = await redis<string[]>([['LRANGE', `mr:of:${pedidoId}`, 0, -1]]);
  const saida: Omit<Oferta, 'pushToken'>[] = [];
  for (const bruto of lista || []) {
    try {
      const { pushToken, ...resto } = JSON.parse(bruto) as Oferta;
      void pushToken;
      saida.push(resto);
    } catch {
      // Entrada corrompida: ignora.
    }
  }
  return saida;
}

export async function acharOferta(pedidoId: string, ofertaId: string): Promise<Oferta | null> {
  const [lista] = await redis<string[]>([['LRANGE', `mr:of:${pedidoId}`, 0, -1]]);
  for (const bruto of lista || []) {
    try {
      const o = JSON.parse(bruto) as Oferta;
      if (o.ofertaId === ofertaId) return o;
    } catch {
      // Entrada corrompida: ignora e continua procurando.
    }
  }
  return null;
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
 * O app e o navegador falam protocolos diferentes.
 *
 * O aplicativo dá um `ExponentPushToken[...]`, entregue pelo serviço do Expo.
 * O navegador dá uma inscrição — um objeto com endpoint e chaves — entregue
 * pelo servidor de push do próprio navegador, assinada com VAPID. Não há como
 * mandar um pelo canal do outro.
 *
 * Os dois ficam guardados no mesmo lugar, e o formato do que está gravado é
 * que diz por onde entregar. Assim entrar na rede é uma coisa só: quem pede
 * socorro não precisa saber se quem está por perto é celular ou computador.
 */
export function ehInscricaoWeb(token: string): boolean {
  return token.startsWith('{');
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

  const paraNavegador = recados.filter((r) => ehInscricaoWeb(r.to));
  const paraApp = recados.filter((r) => !ehInscricaoWeb(r.to));

  const [web, app] = await Promise.all([enviarWebPush(paraNavegador), enviarExpoPush(paraApp)]);
  return { enviados: web.enviados + app.enviados, falhas: web.falhas + app.falhas };
}

/**
 * Push para navegador, assinado com VAPID.
 *
 * Uma inscrição morre sozinha: a pessoa limpa os dados do site, revoga a
 * permissão, troca de navegador. O servidor de push responde 404 ou 410 nesse
 * caso, e aí a entrada é apagada na hora em vez de ficar sendo tentada para
 * sempre — é a mesma limpeza-durante-o-uso que o conjunto geográfico já faz.
 */
async function enviarWebPush(recados: Recado[]): Promise<{ enviados: number; falhas: number }> {
  if (recados.length === 0) return { enviados: 0, falhas: 0 };

  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return { enviados: 0, falhas: recados.length };

  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contato@motorede.app',
    publica,
    privada
  );

  let enviados = 0;
  let falhas = 0;
  const mortas: string[] = [];

  await Promise.all(
    recados.map(async (r) => {
      try {
        await webpush.sendNotification(
          JSON.parse(r.to),
          JSON.stringify({ title: r.title, body: r.body, data: r.data, urgente: r.urgente }),
          { TTL: r.urgente ? 900 : 3600, urgency: r.urgente ? 'high' : 'normal' }
        );
        enviados++;
      } catch (erro) {
        falhas++;
        const codigo = (erro as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) mortas.push(r.to);
      }
    })
  );

  if (mortas.length > 0) void apagarInscricoes(mortas).catch(() => {});
  return { enviados, falhas };
}

/**
 * Apaga inscrições que o servidor de push recusou definitivamente.
 *
 * Precisa varrer porque o que temos em mãos é o valor, não a chave. São
 * poucos registros e isto só roda quando algo já morreu, então o custo é
 * proporcional ao problema.
 */
async function apagarInscricoes(inscricoes: string[]): Promise<void> {
  const [ids] = await redis<string[]>([['ZRANGE', 'mr:geo', 0, -1]]);
  if (!ids || ids.length === 0) return;

  const [valores] = await redis<Array<string | null>>([
    ['MGET', ...ids.map((id) => `mr:tok:${id}`)],
  ]);

  const alvo = new Set(inscricoes);
  const remover = ids.filter((_, i) => valores?.[i] && alvo.has(valores[i] as string));
  if (remover.length === 0) return;

  await redis([
    ['ZREM', 'mr:geo', ...remover],
    ...remover.map((id) => ['DEL', `mr:tok:${id}`]),
  ]);
}

async function enviarExpoPush(recados: Recado[]): Promise<{ enviados: number; falhas: number }> {
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
