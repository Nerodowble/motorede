import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { GeoPoint } from '@motorede/shared';
import {
  entrarNaRede,
  sairDaRede,
  anunciarPresenca,
  posicaoAtual,
  INTERVALO_PRESENCA_MS,
  pedidosAbertos,
  encerrarPedido,
  type EstadoRede,
} from '../services/socorro';
import { storage } from '../services/storage';

/**
 * Mantém este aparelho alcançável e escuta os chamados que chegam.
 *
 * QUANDO A PRESENÇA É RENOVADA
 *
 * Ao entrar na rede, a cada dez minutos com o app aberto, e toda vez que o app
 * volta do segundo plano. Este último é o que mais importa na prática: quem
 * está rodando abre o app num posto, e é nessa hora que a posição vale.
 *
 * O temporizador é deliberadamente parado quando o app sai de cena. Um
 * `setInterval` sobrevive em segundo plano no React Native, e continuar
 * mandando posição dali seria rastrear sem permissão para isso — a permissão
 * concedida é de primeiro plano.
 */

/** Chamado recebido por push, montado a partir do que veio na notificação. */
export interface ChamadoRecebido {
  pedidoId: string;
  kind: 'emergencia' | 'apoio';
  emergency?: string;
  nome: string;
  moto?: string;
  referencia: string;
  detalhes?: string;
  /** Célula de ~1 km. Nunca o ponto exato de quem pediu. */
  celula: GeoPoint | null;
  distanciaAproxKm?: number;
  em: string;
  respondido?: boolean;
}

/** Mesmo prazo do servidor: passado isso, o pedido já não existe mais lá. */
const VALIDADE_MS = 2 * 60 * 60 * 1000;

/** Um pedido que VOCÊ abriu e ainda está de pé. */
export interface MeuPedido {
  pedidoId: string;
  kind: 'emergencia' | 'apoio';
  referencia: string;
  /** O número que VOCÊ informou neste pedido, que pode não ser o do perfil. */
  telefone?: string;
  em: string;
  encontrados: number;
  avisados: number;
}

/** Aviso recebido de alguém que se ofereceu para ajudar no seu pedido. */
export interface RespostaRecebida {
  pedidoId: string;
  /** Identifica esta oferta na hora de aceitar. */
  ofertaId?: string;
  nome: string;
  moto?: string;
  celula: GeoPoint | null;
  em: string;
  aceita?: boolean;
}

/**
 * Você foi aceito: aqui chega o endereço exato e o telefone.
 *
 * Só existe depois que quem pediu escolheu você, nominalmente. Antes disso a
 * única coisa que você tinha era a região de ~1 km.
 */
export interface AceiteRecebido {
  pedidoId: string;
  nome: string;
  telefone: string | null;
  referencia: string | null;
  exato: GeoPoint | null;
  em: string;
}

function comoChamado(dados: Record<string, unknown>): ChamadoRecebido | null {
  if (dados.tipo !== 'socorro' || typeof dados.pedidoId !== 'string') return null;
  return {
    pedidoId: dados.pedidoId,
    kind: dados.kind === 'apoio' ? 'apoio' : 'emergencia',
    emergency: typeof dados.emergency === 'string' ? dados.emergency : undefined,
    nome: typeof dados.nome === 'string' ? dados.nome : 'Um piloto',
    moto: typeof dados.moto === 'string' ? dados.moto : undefined,
    referencia: typeof dados.referencia === 'string' ? dados.referencia : '',
    detalhes: typeof dados.detalhes === 'string' ? dados.detalhes : undefined,
    celula: (dados.celula as GeoPoint) ?? null,
    distanciaAproxKm:
      typeof dados.distanciaAproxKm === 'number' ? dados.distanciaAproxKm : undefined,
    em: typeof dados.em === 'string' ? dados.em : new Date().toISOString(),
  };
}

function comoAceite(dados: Record<string, unknown>): AceiteRecebido | null {
  if (dados.tipo !== 'aceito' || typeof dados.pedidoId !== 'string') return null;
  return {
    pedidoId: dados.pedidoId,
    nome: typeof dados.nome === 'string' ? dados.nome : 'Quem pediu',
    telefone: typeof dados.telefone === 'string' ? dados.telefone : null,
    referencia: typeof dados.referencia === 'string' ? dados.referencia : null,
    exato: (dados.exato as GeoPoint) ?? null,
    em: typeof dados.em === 'string' ? dados.em : new Date().toISOString(),
  };
}

function comoResposta(dados: Record<string, unknown>): RespostaRecebida | null {
  if (dados.tipo !== 'resposta-socorro' || typeof dados.pedidoId !== 'string') return null;
  return {
    pedidoId: dados.pedidoId,
    ofertaId: typeof dados.ofertaId === 'string' ? dados.ofertaId : undefined,
    nome: typeof dados.nome === 'string' ? dados.nome : 'Um piloto',
    moto: typeof dados.moto === 'string' ? dados.moto : undefined,
    celula: (dados.celula as GeoPoint) ?? null,
    em: typeof dados.em === 'string' ? dados.em : new Date().toISOString(),
  };
}

export function useSocorro() {
  const [rede, setRede] = useState<EstadoRede>({ disponivel: false });
  const [entrando, setEntrando] = useState(false);
  const [posicao, setPosicao] = useState<GeoPoint | null>(null);
  const [chamados, setChamados] = useState<ChamadoRecebido[]>([]);
  const [respostas, setRespostas] = useState<RespostaRecebida[]>([]);
  const [meusPedidos, setMeusPedidos] = useState<MeuPedido[]>([]);
  const [aceites, setAceites] = useState<AceiteRecebido[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Busca o que já está aberto perto daqui.
   *
   * O push alcança quem estava online no instante do pedido. Isto alcança todo
   * o resto: quem abriu o app depois, quem estava sem sinal, quem dispensou a
   * notificação sem querer.
   */
  const buscarAbertos = useCallback(async (onde: GeoPoint) => {
    const abertos = await pedidosAbertos(onde, 25, rede.pushToken);
    setChamados((antes) => {
      const jaTenho = new Set(antes.map((c) => c.pedidoId));
      const novos = abertos
        .filter((p) => !jaTenho.has(p.pedidoId))
        .map((p) => ({
          pedidoId: p.pedidoId,
          kind: p.kind,
          emergency: p.emergency,
          nome: p.nome,
          moto: p.moto,
          referencia: p.referencia,
          detalhes: p.detalhes,
          celula: p.celula,
          em: p.em,
        }));
      return novos.length ? [...novos, ...antes] : antes;
    });
  }, [rede.pushToken]);

  const entrar = useCallback(async () => {
    setEntrando(true);
    const estado = await entrarNaRede();
    setRede(estado);
    if (estado.posicao) {
      setPosicao(estado.posicao);
      await buscarAbertos(estado.posicao);
    }
    setEntrando(false);
    return estado;
  }, [buscarAbertos]);

  // Ao abrir, recupera os próprios pedidos e descarta os que já venceram no
  // servidor. Mostrar um pedido que não existe mais faria você acreditar que
  // ainda há gente a caminho.
  useEffect(() => {
    void storage.getMeusPedidos().then((lista) => {
      const agora = Date.now();
      const vivos = (lista as MeuPedido[]).filter(
        (p) => agora - new Date(p.em).getTime() < VALIDADE_MS
      );
      setMeusPedidos(vivos);
      if (vivos.length !== lista.length) void storage.saveMeusPedidos(vivos);
    });
  }, []);

  const registrarMeuPedido = useCallback((pedido: MeuPedido) => {
    setMeusPedidos((antes) => {
      const proximo = [pedido, ...antes.filter((p) => p.pedidoId !== pedido.pedidoId)];
      void storage.saveMeusPedidos(proximo);
      return proximo;
    });
  }, []);

  const encerrarMeuPedido = useCallback(
    async (pedidoId: string) => {
      if (rede.pushToken) await encerrarPedido(rede.pushToken, pedidoId);
      setMeusPedidos((antes) => {
        const proximo = antes.filter((p) => p.pedidoId !== pedidoId);
        void storage.saveMeusPedidos(proximo);
        return proximo;
      });
    },
    [rede.pushToken]
  );

  const sair = useCallback(async () => {
    if (rede.pushToken) await sairDaRede(rede.pushToken);
    setRede({ disponivel: false });
  }, [rede.pushToken]);

  const renovar = useCallback(async () => {
    if (!rede.disponivel || !rede.pushToken) return;
    const p = await posicaoAtual();
    if (!p) return;
    setPosicao(p);
    await anunciarPresenca(rede.pushToken, p);
    await buscarAbertos(p);
  }, [rede.disponivel, rede.pushToken, buscarAbertos]);

  // Enquanto o app estiver à vista. Sai de cena, para.
  useEffect(() => {
    const parar = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };

    if (!rede.disponivel) return parar;

    const comecar = () => {
      parar();
      timer.current = setInterval(() => void renovar(), INTERVALO_PRESENCA_MS);
    };

    comecar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        void renovar();
        // Religar é o ponto: ao sair de cena o temporizador é parado, e sem
        // recriá-lo aqui a renovação periódica morria na primeira vez que o
        // app fosse para segundo plano — a presença simplesmente vencia depois
        // de 45 minutos, em silêncio, mesmo com o app aberto na tela.
        comecar();
      } else {
        parar();
      }
    });

    return () => {
      parar();
      sub.remove();
    };
  }, [rede.disponivel, renovar]);

  // Chamados que chegam com o app aberto, e o toque na notificação quando ele
  // está fechado. Os dois caminhos existem porque o Android entrega de formas
  // diferentes conforme o app esteja à vista ou não.
  useEffect(() => {
    const guardar = (dados: Record<string, unknown>) => {
      const chamado = comoChamado(dados);
      if (chamado) {
        setChamados((antes) =>
          antes.some((c) => c.pedidoId === chamado.pedidoId) ? antes : [chamado, ...antes]
        );
        return;
      }
      const resposta = comoResposta(dados);
      if (resposta) {
        setRespostas((antes) => [resposta, ...antes]);
        return;
      }
      const aceite = comoAceite(dados);
      if (aceite) setAceites((antes) => [aceite, ...antes]);
    };

    const recebida = Notifications.addNotificationReceivedListener((n) =>
      guardar(n.request.content.data as Record<string, unknown>)
    );
    const tocada = Notifications.addNotificationResponseReceivedListener((r) =>
      guardar(r.notification.request.content.data as Record<string, unknown>)
    );

    // Se o app abriu POR CAUSA de uma notificação, ela não passa pelos
    // ouvintes acima — já tinha sido entregue antes deste código existir.
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) guardar(r.notification.request.content.data as Record<string, unknown>);
    });

    return () => {
      recebida.remove();
      tocada.remove();
    };
  }, []);

  const marcarAceita = useCallback((ofertaId: string) => {
    setRespostas((antes) =>
      antes.map((r) => (r.ofertaId === ofertaId ? { ...r, aceita: true } : r))
    );
  }, []);

  const marcarRespondido = useCallback((pedidoId: string) => {
    setChamados((antes) =>
      antes.map((c) => (c.pedidoId === pedidoId ? { ...c, respondido: true } : c))
    );
  }, []);

  const dispensarChamado = useCallback((pedidoId: string) => {
    setChamados((antes) => antes.filter((c) => c.pedidoId !== pedidoId));
  }, []);

  return {
    rede,
    entrando,
    posicao,
    chamados,
    respostas,
    aceites,
    marcarAceita,
    entrar,
    sair,
    renovar,
    marcarRespondido,
    dispensarChamado,
    meusPedidos,
    registrarMeuPedido,
    encerrarMeuPedido,
  };
}
