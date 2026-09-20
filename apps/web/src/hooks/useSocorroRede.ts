import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '@motorede/shared';
import {
  entrarNaRede,
  sairDaRede,
  anunciarPresenca,
  posicaoAtual,
  pushSuportado,
  precisaInstalarNoIphone,
  pedidosAbertos,
  encerrarPedido,
  type EstadoRede,
} from '../services/socorroRede';

/**
 * Mantém este navegador alcançável e escuta os chamados que chegam.
 *
 * Os chamados chegam pelo service worker, que os repassa para a página por
 * mensagem. Vale para os dois casos: push recebido com a aba aberta, e toque
 * na notificação com a aba fechada — o service worker é o mesmo, muda só quem
 * está na frente.
 *
 * A lista vem de duas fontes, e precisa das duas: o push traz o que acontece
 * agora, e a consulta ao servidor traz o que já estava aberto quando você
 * chegou. Só com push, quem abrisse a página um minuto depois do pedido nunca
 * ficaria sabendo.
 */

const INTERVALO_PRESENCA_MS = 10 * 60 * 1000;

export interface ChamadoRecebido {
  pedidoId: string;
  kind: 'emergencia' | 'apoio';
  nome: string;
  moto?: string;
  referencia: string;
  detalhes?: string;
  celula: GeoPoint | null;
  em: string;
  respondido?: boolean;
}

export interface RespostaRecebida {
  pedidoId: string;
  nome: string;
  moto?: string;
  celula: GeoPoint | null;
  em: string;
}

export function useSocorroRede() {
  const [rede, setRede] = useState<EstadoRede>({ disponivel: false });
  const [entrando, setEntrando] = useState(false);
  const [posicao, setPosicao] = useState<GeoPoint | null>(null);
  const [chamados, setChamados] = useState<ChamadoRecebido[]>([]);
  const [respostas, setRespostas] = useState<RespostaRecebida[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Busca o que já está aberto perto daqui.
   *
   * O push alcança quem estava online no instante do pedido. Isto alcança
   * todo o resto: quem abriu depois, quem estava sem sinal, quem dispensou a
   * notificação sem querer. Roda ao entrar na rede e ao voltar para a aba.
   */
  const buscarAbertos = useCallback(async (onde: GeoPoint) => {
    const abertos = await pedidosAbertos(onde);
    setChamados((antes) => {
      const jaTenho = new Set(antes.map((c) => c.pedidoId));
      const novos = abertos
        .filter((p) => !jaTenho.has(p.pedidoId))
        .map((p) => ({
          pedidoId: p.pedidoId,
          kind: p.kind,
          nome: p.nome,
          moto: p.moto,
          referencia: p.referencia,
          detalhes: p.detalhes,
          celula: p.celula,
          em: p.em,
        }));
      return novos.length ? [...novos, ...antes] : antes;
    });
  }, []);

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

  const encerrarMeuPedido = useCallback(async (pedidoId: string) => {
    await encerrarPedido(pedidoId);
  }, []);

  const sair = useCallback(async () => {
    await sairDaRede();
    setRede({ disponivel: false });
  }, []);

  const renovar = useCallback(async () => {
    if (!rede.disponivel || !rede.inscricao) return;
    const p = await posicaoAtual();
    if (!p) return;
    setPosicao(p);
    await anunciarPresenca(rede.inscricao, p);
    await buscarAbertos(p);
  }, [rede.disponivel, rede.inscricao, buscarAbertos]);

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

    // Voltar para a aba é o momento em que a posição mais provavelmente mudou.
    // Religar o temporizador aqui também: pausar sem recriar deixaria a
    // presença vencer em silêncio com a página aberta na tela.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') {
        void renovar();
        comecar();
      } else {
        parar();
      }
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      parar();
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [rede.disponivel, renovar]);

  // Mensagens vindas do service worker.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const ouvir = (evento: MessageEvent) => {
      const carga = evento.data;
      if (!carga || carga.origem !== 'motorede-push') return;
      const d = carga.dados || {};

      if (d.tipo === 'socorro' && typeof d.pedidoId === 'string') {
        setChamados((antes) =>
          antes.some((c) => c.pedidoId === d.pedidoId)
            ? antes
            : [
                {
                  pedidoId: d.pedidoId,
                  kind: d.kind === 'apoio' ? 'apoio' : 'emergencia',
                  nome: d.nome || 'Um piloto',
                  moto: d.moto,
                  referencia: d.referencia || '',
                  detalhes: d.detalhes,
                  celula: d.celula ?? null,
                  em: d.em || new Date().toISOString(),
                },
                ...antes,
              ]
        );
      } else if (d.tipo === 'resposta-socorro' && typeof d.pedidoId === 'string') {
        setRespostas((antes) => [
          {
            pedidoId: d.pedidoId,
            nome: d.nome || 'Um piloto',
            moto: d.moto,
            celula: d.celula ?? null,
            em: d.em || new Date().toISOString(),
          },
          ...antes,
        ]);
      }
    };

    navigator.serviceWorker.addEventListener('message', ouvir);
    return () => navigator.serviceWorker.removeEventListener('message', ouvir);
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
    marcarRespondido,
    dispensarChamado,
    encerrarMeuPedido,
    suportado: pushSuportado(),
    precisaInstalar: precisaInstalarNoIphone(),
  };
}
