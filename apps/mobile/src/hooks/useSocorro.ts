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
  type EstadoRede,
} from '../services/socorro';

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

/** Aviso recebido de alguém que se ofereceu para ajudar no seu pedido. */
export interface RespostaRecebida {
  pedidoId: string;
  nome: string;
  moto?: string;
  celula: GeoPoint | null;
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

function comoResposta(dados: Record<string, unknown>): RespostaRecebida | null {
  if (dados.tipo !== 'resposta-socorro' || typeof dados.pedidoId !== 'string') return null;
  return {
    pedidoId: dados.pedidoId,
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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const entrar = useCallback(async () => {
    setEntrando(true);
    const estado = await entrarNaRede();
    setRede(estado);
    if (estado.posicao) setPosicao(estado.posicao);
    setEntrando(false);
    return estado;
  }, []);

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
  }, [rede.disponivel, rede.pushToken]);

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
      if (resposta) setRespostas((antes) => [resposta, ...antes]);
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
    entrar,
    sair,
    renovar,
    marcarRespondido,
    dispensarChamado,
  };
}
