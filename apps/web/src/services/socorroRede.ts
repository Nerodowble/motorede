import { coarsenLocation, type GeoPoint } from '@motorede/shared';

/**
 * A web entrando na mesma rede de socorro do aplicativo.
 *
 * O SERVIDOR É O MESMO, O CANAL DE ENTREGA NÃO
 *
 * O aplicativo recebe pelo serviço do Expo; o navegador recebe pelo servidor
 * de push do próprio navegador, com assinatura VAPID. São protocolos
 * diferentes, mas a rede é uma só: quem pede socorro do celular alcança quem
 * está no computador, e vice-versa. Quem pede não precisa saber a diferença.
 *
 * O QUE SAI DAQUI
 *
 * A inscrição de push, um identificador deste navegador, e a célula de ~1 km
 * onde você está — nunca o ponto exato. O servidor arredonda de novo, porque
 * este código roda na máquina do usuário e pode ser trocado.
 *
 * O LIMITE DO NAVEGADOR
 *
 * No iPhone, push na web só funciona se o site estiver instalado na tela de
 * início (iOS 16.4+). No Safari em aba comum, não existe. Isso não é
 * configuração faltando: é o sistema. A tela precisa dizer, não sugerir que
 * vai funcionar e silenciar.
 */

const CHAVE_ID = 'motorede_device_id';

export interface EstadoRede {
  disponivel: boolean;
  motivo?: string;
  inscricao?: string;
  posicao?: GeoPoint;
}

/** Identificador deste navegador. É o navegador, não a pessoa: é nele que toca. */
export function deviceId(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_ID);
    if (salvo) return salvo;
    const novo = `w-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`.slice(0, 32);
    localStorage.setItem(CHAVE_ID, novo);
    return novo;
  } catch {
    // Armazenamento bloqueado: vale só para esta sessão, e sair da rede ao
    // fechar é melhor que falhar na entrada.
    return `w-${Math.random().toString(36).slice(2, 18)}`;
  }
}

export function pushSuportado(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Detecta o caso em que o iPhone só entrega push com o site instalado. */
export function precisaInstalarNoIphone(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const instalado =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios && !instalado;
}

/** A chave pública vem da API, não do build. */
async function chavePublica(): Promise<string | null> {
  try {
    const r = await fetch('/api/presenca');
    const corpo = await r.json();
    return corpo.vapidPublicKey ?? null;
  } catch {
    return null;
  }
}

/** base64url -> bytes, formato que o PushManager exige. */
function paraBytes(base64url: string): Uint8Array {
  const preenchido = base64url.padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=');
  const bruto = atob(preenchido.replace(/-/g, '+').replace(/_/g, '/'));
  const saida = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

export function posicaoAtual(): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      // Sem posição é `null`. Esta tela já teve uma coordenada de reserva fixa
      // na Av. Paulista, e um socorro saía apontando para outra cidade.
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

export async function entrarNaRede(): Promise<EstadoRede> {
  if (!pushSuportado()) {
    return {
      disponivel: false,
      motivo: 'Este navegador não recebe notificações. Use o aplicativo para ser avisado.',
    };
  }

  if (precisaInstalarNoIphone()) {
    return {
      disponivel: false,
      motivo:
        'No iPhone, o aviso só chega se o MotoRede estiver na sua tela de início. Toque em Compartilhar e em "Adicionar à Tela de Início".',
    };
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    return {
      disponivel: false,
      motivo: 'Sem permissão de notificação, ninguém consegue te avisar de um socorro por perto.',
    };
  }

  const chave = await chavePublica();
  if (!chave) {
    return { disponivel: false, motivo: 'O servidor ainda não tem chave de push configurada.' };
  }

  let inscricao: PushSubscription;
  try {
    const registro = await navigator.serviceWorker.ready;
    inscricao =
      (await registro.pushManager.getSubscription()) ??
      (await registro.pushManager.subscribe({
        // Obrigatório nos navegadores atuais: toda mensagem tem que virar uma
        // notificação visível. Não dá para receber em silêncio.
        userVisibleOnly: true,
        applicationServerKey: paraBytes(chave),
      }));
  } catch (erro) {
    return {
      disponivel: false,
      motivo: erro instanceof Error ? erro.message : 'Não consegui inscrever este navegador.',
    };
  }

  const posicao = await posicaoAtual();
  if (!posicao) {
    return {
      disponivel: false,
      motivo: 'Sem localização não dá para saber quem está perto de você — nem você deles.',
    };
  }

  const texto = JSON.stringify(inscricao);
  const ok = await anunciarPresenca(texto, posicao);
  if (!ok) return { disponivel: false, motivo: 'Não consegui falar com o servidor da rede.' };

  return { disponivel: true, inscricao: texto, posicao };
}

export async function anunciarPresenca(inscricao: string, posicao: GeoPoint): Promise<boolean> {
  try {
    const r = await fetch('/api/presenca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: deviceId(),
        pushToken: inscricao,
        position: coarsenLocation(posicao),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function sairDaRede(): Promise<void> {
  try {
    await fetch('/api/presenca', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceId() }),
    });
    const registro = await navigator.serviceWorker.ready;
    const inscricao = await registro.pushManager.getSubscription();
    await inscricao?.unsubscribe();
  } catch {
    // Falhando, a entrada vence sozinha em 45 minutos.
  }
}

export interface PedidoAberto {
  pedidoId: string;
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

/**
 * O que ainda está aberto perto de você.
 *
 * O push avisa quem estava online no instante do pedido; esta lista é para
 * todo o resto — quem abriu o app depois, quem estava sem sinal, quem
 * dispensou a notificação sem querer. Sem ela, chegar um minuto atrasado
 * significava nunca ficar sabendo.
 */
export async function pedidosAbertos(posicao: GeoPoint, raioKm = 25): Promise<PedidoAberto[]> {
  try {
    const r = await fetch(
      `/api/socorro?lat=${posicao.lat}&lng=${posicao.lng}&raioKm=${raioKm}&excluir=${deviceId()}`
    );
    if (!r.ok) return [];
    const corpo = await r.json();
    return Array.isArray(corpo.pedidos) ? corpo.pedidos : [];
  } catch {
    return [];
  }
}

/** Tira o próprio pedido da lista. Pedido velho manda gente atrás de quem já foi. */
export async function encerrarPedido(pedidoId: string): Promise<boolean> {
  try {
    const r = await fetch('/api/socorro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'encerrar', deviceId: deviceId(), pedidoId }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export interface PedidoEnviado {
  pedidoId: string;
  encontrados: number;
  avisados: number;
}
export interface FalhaPedido {
  erro: string;
  semGps?: boolean;
}

export async function pedirSocorro(dados: {
  inscricao: string;
  kind: 'emergencia' | 'apoio';
  emergency?: string;
  nome: string;
  moto: string;
  referencia: string;
  detalhes: string;
  posicao: GeoPoint;
  raioKm: number;
}): Promise<PedidoEnviado | FalhaPedido> {
  const pedidoId = `ped-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const r = await fetch('/api/socorro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'pedir',
        deviceId: deviceId(),
        pushToken: dados.inscricao,
        pedidoId,
        kind: dados.kind,
        emergency: dados.emergency,
        nome: dados.nome,
        moto: dados.moto,
        referencia: dados.referencia,
        detalhes: dados.detalhes,
        position: dados.posicao,
        raioKm: dados.raioKm,
      }),
    });
    const corpo = await r.json();
    if (!r.ok) return { erro: corpo.error || 'Não foi possível acionar a rede.', semGps: corpo.semGps };
    return { pedidoId, encontrados: corpo.encontrados ?? 0, avisados: corpo.avisados ?? 0 };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : 'Sem conexão para acionar a rede.' };
  }
}

/**
 * Quem pediu escolhe uma pessoa, e só ela recebe o endereço exato.
 *
 * É o único momento em que o ponto preciso e o telefone saem daqui. Eles
 * passam pelo servidor como um recado e não ficam gravados: até agora todo
 * mundo viu apenas a célula de ~1 km.
 */
export async function aceitarAjuda(dados: {
  pedidoId: string;
  ofertaId: string;
  nome: string;
  telefone: string;
  referencia: string;
  precisa: GeoPoint;
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const r = await fetch('/api/socorro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'aceitar', deviceId: deviceId(), ...dados }),
    });
    const corpo = await r.json();
    return r.ok ? { ok: true } : { ok: false, erro: corpo.error };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : 'Sem conexão.' };
  }
}

export interface OfertaRecebida {
  ofertaId: string;
  nome: string;
  moto?: string;
  celula: GeoPoint | null;
  em: string;
}

/**
 * Quem se ofereceu no seu pedido.
 *
 * Mesmo motivo da lista de pedidos abertos: o push pode falhar, chegar com o
 * app fechado, ou ser dispensado sem querer. Sem esta consulta, alguém estaria
 * disposto a te ajudar e você nunca ficaria sabendo — nem teria como liberar
 * o endereço para essa pessoa.
 */
export async function ofertasDoMeuPedido(pedidoId: string, quem: string): Promise<OfertaRecebida[]> {
  try {
    const r = await fetch(
      `/api/socorro?ofertas=${encodeURIComponent(pedidoId)}&deviceId=${encodeURIComponent(quem)}`
    );
    if (!r.ok) return [];
    const corpo = await r.json();
    return Array.isArray(corpo.ofertas) ? corpo.ofertas : [];
  } catch {
    return [];
  }
}

export async function responderChamado(dados: {
  pedidoId: string;
  inscricao: string;
  nome: string;
  moto: string;
  resposta: string;
  posicao: GeoPoint | null;
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const r = await fetch('/api/socorro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'responder',
        deviceId: deviceId(),
        // Precisa ir: é por ele que o servidor alcança você se quem pediu
        // aceitar sua ajuda e liberar o endereço.
        pushToken: dados.inscricao,
        pedidoId: dados.pedidoId,
        nome: dados.nome,
        moto: dados.moto,
        resposta: dados.resposta,
        position: dados.posicao ? coarsenLocation(dados.posicao) : null,
      }),
    });
    const corpo = await r.json();
    return r.ok ? { ok: true } : { ok: false, erro: corpo.error };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : 'Sem conexão.' };
  }
}
