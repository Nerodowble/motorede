import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { coarsenLocation, type GeoPoint } from '@motorede/shared';
import { API_BASE } from '../config';

/**
 * A ponte entre o app e a rede de socorro.
 *
 * O QUE SAI DAQUI, E O QUE NÃO SAI
 *
 * Sai: um identificador deste aparelho, o endereço de push, e a célula de
 * ~1 km onde você está. Não sai o ponto exato — ele é arredondado ANTES de
 * viajar. O servidor arredonda de novo, porque este código roda no aparelho e
 * pode ser trocado; a promessa não pode depender só daqui.
 *
 * O QUE FICA GUARDADO NO SERVIDOR
 *
 * O pedido em aberto: nome, texto e a célula de ~1 km, por até 2 horas. É o
 * que permite alguém que abriu o app depois ainda enxergar quem precisa de
 * ajuda — antes o pedido só existia como push, e chegar um minuto atrasado
 * significava nunca ficar sabendo.
 *
 * O que NÃO fica: endereço exato, telefone, conversa. Isso continua só no
 * aparelho de quem pediu, e o endereço só vai para quem ele aceitar.
 *
 * O LIMITE HONESTO
 *
 * A presença é renovada quando o app está aberto, e vence em 45 minutos. Ou
 * seja: você é alcançável por 45 minutos depois da última vez que abriu o app.
 * Manter isso vivo com o app fechado exigiria localização em segundo plano —
 * permissão pesada e bateria — e essa conta não foi feita ainda. Enquanto não
 * for, a tela precisa dizer isso, e não sugerir uma cobertura que não existe.
 */

/**
 * Sem isto, notificação que chega com o app ABERTO não aparece.
 *
 * O padrão do sistema é engolir a notificação quando o app já está à vista,
 * assumindo que a própria tela vai mostrar o que interessa. Para um pedido de
 * socorro isso é justamente o contrário do necessário: quem está com o app
 * aberto numa outra aba é quem pode atender mais rápido.
 *
 * `shouldShowBanner` e `shouldShowList` no lugar de `shouldShowAlert`, que
 * ficou obsoleto quando os dois foram separados.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Atualiza a presença com esta frequência enquanto o app estiver aberto. */
export const INTERVALO_PRESENCA_MS = 10 * 60 * 1000;

export interface EstadoRede {
  disponivel: boolean;
  motivo?: string;
  pushToken?: string;
  posicao?: GeoPoint;
}

/**
 * Identificador estável deste aparelho.
 *
 * Não é o usuário: é o aparelho, porque é nele que o telefone toca. Usa o
 * próprio token de push como base — ele já é único por instalação, então não
 * inventamos mais um identificador para guardar e sincronizar.
 */
export function deviceIdDe(pushToken: string): string {
  return pushToken.replace(/[^A-Za-z0-9]/g, '').slice(-32);
}

/**
 * Prepara os canais de notificação do Android.
 *
 * Sem canal declarado, o Android decide sozinho a importância — e costuma
 * decidir baixo, o que para um pedido de socorro significa chegar silencioso na
 * gaveta. São dois canais separados de propósito: quem se incomoda com pedidos
 * de apoio pode desligar só esse, no ajuste do próprio sistema, sem perder o
 * socorro.
 */
export async function prepararCanais(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('socorro', {
    name: 'Socorro na estrada',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#f59e0b',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync('apoio', {
    name: 'Pedidos de apoio',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/**
 * Pede as permissões e devolve o endereço de push deste aparelho.
 *
 * Cada recusa possível vira um motivo em português, porque "não foi possível"
 * não diz à pessoa o que ela pode fazer a respeito.
 */
export async function entrarNaRede(): Promise<EstadoRede> {
  if (!Device.isDevice) {
    return {
      disponivel: false,
      motivo: 'Notificação por push não funciona em emulador, só em aparelho de verdade.',
    };
  }

  await prepararCanais();

  const permissaoAtual = await Notifications.getPermissionsAsync();
  let concedida = permissaoAtual.granted;
  if (!concedida && permissaoAtual.canAskAgain) {
    concedida = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!concedida) {
    return {
      disponivel: false,
      motivo: 'Sem permissão de notificação, ninguém consegue te avisar de um socorro por perto.',
    };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return { disponivel: false, motivo: 'Este build não tem identificador de projeto do Expo.' };
  }

  let pushToken: string;
  try {
    pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (erro) {
    return {
      disponivel: false,
      motivo: erro instanceof Error ? erro.message : 'Não consegui obter o endereço de push.',
    };
  }

  const local = await Location.getForegroundPermissionsAsync();
  let podeLocalizar = local.granted;
  if (!podeLocalizar && local.canAskAgain) {
    podeLocalizar = (await Location.requestForegroundPermissionsAsync()).granted;
  }
  if (!podeLocalizar) {
    return {
      disponivel: false,
      pushToken,
      motivo: 'Sem localização não dá para saber quem está perto de você — nem você deles.',
    };
  }

  const posicao = await posicaoAtual();
  if (!posicao) {
    return { disponivel: false, pushToken, motivo: 'O GPS não respondeu. Tente a céu aberto.' };
  }

  await anunciarPresenca(pushToken, posicao);
  return { disponivel: true, pushToken, posicao };
}

export async function posicaoAtual(): Promise<GeoPoint | null> {
  try {
    const p = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  } catch {
    // Sem posição é `null` e ponto final. A versão web disso já teve uma
    // coordenada de mentira como reserva, e um socorro podia sair apontando
    // para outra cidade sem ninguém desconfiar.
    return null;
  }
}

/** Diz à rede onde este aparelho está, de forma aproximada. */
export async function anunciarPresenca(pushToken: string, posicao: GeoPoint): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/presenca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: deviceIdDe(pushToken),
        pushToken,
        // Arredondado antes de sair. O servidor arredonda de novo.
        position: coarsenLocation(posicao),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Sai da rede. Efeito imediato, não depende de esperar o prazo vencer. */
export async function sairDaRede(pushToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/presenca`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceIdDe(pushToken) }),
    });
  } catch {
    // Se falhar, a entrada vence sozinha em 45 minutos.
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
export async function pedidosAbertos(
  posicao: GeoPoint,
  raioKm = 25,
  pushToken?: string
): Promise<PedidoAberto[]> {
  try {
    const r = await fetch(
      `${API_BASE}/socorro?lat=${posicao.lat}&lng=${posicao.lng}&raioKm=${raioKm}` +
        (pushToken ? `&excluir=${deviceIdDe(pushToken)}` : '')
    );
    if (!r.ok) return [];
    const corpo = await r.json();
    return Array.isArray(corpo.pedidos) ? corpo.pedidos : [];
  } catch {
    return [];
  }
}

/** Tira o próprio pedido da lista. Pedido velho manda gente atrás de quem já foi. */
export async function encerrarPedido(pushToken: string, pedidoId: string): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/socorro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'encerrar', deviceId: deviceIdDe(pushToken), pedidoId }),
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

/** Dispara o pedido. Devolve números reais, ou o motivo da recusa. */
export async function pedirSocorro(dados: {
  pushToken: string;
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
    const r = await fetch(`${API_BASE}/socorro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'pedir',
        deviceId: deviceIdDe(dados.pushToken),
        pushToken: dados.pushToken,
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

/** Responde a um chamado que chegou por push. */
export async function responderChamado(dados: {
  pushToken: string;
  pedidoId: string;
  nome: string;
  moto: string;
  resposta: string;
  posicao: GeoPoint | null;
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const r = await fetch(`${API_BASE}/socorro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'responder',
        deviceId: deviceIdDe(dados.pushToken),
        pedidoId: dados.pedidoId,
        nome: dados.nome,
        moto: dados.moto,
        resposta: dados.resposta,
        position: dados.posicao ? coarsenLocation(dados.posicao) : null,
      }),
    });
    const corpo = await r.json();
    if (!r.ok) return { ok: false, erro: corpo.error };
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : 'Sem conexão.' };
  }
}
