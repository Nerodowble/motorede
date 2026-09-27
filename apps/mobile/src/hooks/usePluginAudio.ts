import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RemoteAudioTrack, RoomEvent, type RemoteParticipant, type Room } from 'livekit-client';
import {
  decodePluginState,
  isPluginParticipant,
  PLUGIN_TOPIC,
  pluginPlaybackVolume,
  type PluginCommand,
  type PluginMessage,
  type PluginState,
} from '@motorede/shared';
import { API_BASE } from '../config';

/**
 * Painel do plugin de áudio na sala do comboio.
 *
 * Três fontes, cada uma com seu papel:
 * - o servidor diz QUAIS plugins servem para este comboio e se estão ligados;
 * - o participante do plugin na sala diz O QUE está tocando (atributos);
 * - comandos vão por mensagem de dados, direto para o plugin.
 *
 * O app não inventa estado: depois de um comando, espera o plugin confirmar
 * pelos atributos. Se não confirmar, diz isso.
 */

export interface AvailablePlugin {
  id: string;
  nome: string;
  identidade: string;
  online: boolean;
}

export type PluginPhase =
  | 'indisponivel' // nenhum plugin para este comboio
  | 'fora' // disponível, fora da sala
  | 'chamando'
  | 'sem-resposta'
  | 'na-sala';

const ENDPOINT = `${API_BASE}/plugins`;
const ESPERA_ENTRADA_MS = 30_000;
const ESPERA_CONFIRMACAO_MS = 5_000;

export function usePluginAudio(room: Room | null, sessionToken: string | null) {
  /** Plugins pareados com este comboio (pode haver mais de um). */
  const [plugins, setPlugins] = useState<AvailablePlugin[]>([]);
  /** Qual deles o card está controlando. null = o primeiro. */
  const [ativoId, setAtivoId] = useState<string | null>(null);
  const plugin = useMemo(
    () => plugins.find((p) => p.id === ativoId) ?? plugins[0] ?? null,
    [plugins, ativoId]
  );
  // Os efeitos dependem só da identidade: a lista é recriada a cada consulta.
  const identidadeAtiva = plugin?.identidade ?? null;
  const [participante, setParticipante] = useState<RemoteParticipant | null>(null);
  const [estado, setEstado] = useState<PluginState | null>(null);
  const [chamando, setChamando] = useState(false);
  const [semResposta, setSemResposta] = useState(false);
  const [silenciadoPorMim, setSilenciadoPorMim] = useState(false);
  /** Volume do plugin neste aparelho, 0 a 100. Como o de um participante. */
  const [volume, setVolumeState] = useState(100);
  const [pendente, setPendente] = useState(false);
  const [naoConfirmou, setNaoConfirmou] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const silenciadoRef = useRef(false);
  silenciadoRef.current = silenciadoPorMim;
  const volumeRef = useRef(100);
  volumeRef.current = volume;

  const setVolume = useCallback((v: number) => setVolumeState(Math.min(100, Math.max(0, v))), []);

  // Descobre os plugins deste comboio. Repete a cada 15 s: acompanha o
  // "ligado/desligado" de cada computador e quem outro piloto pareou.
  const descobrir = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'listar', token: sessionToken }),
      });
      if (!r.ok) return;
      const { plugins } = (await r.json()) as { plugins: AvailablePlugin[] };
      setPlugins(plugins);
    } catch {
      // sem rede: mantém o que já sabia
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken) {
      setPlugins([]);
      setAtivoId(null);
      return;
    }
    void descobrir();
    const t = setInterval(() => void descobrir(), 15_000);
    return () => clearInterval(t);
  }, [sessionToken, descobrir]);

  // Acha o participante do plugin e acompanha seu estado.
  useEffect(() => {
    if (!room || !identidadeAtiva) {
      setParticipante(null);
      setEstado(null);
      return;
    }

    const aplicarVolume = () => {
      const volume = pluginPlaybackVolume(volumeRef.current, silenciadoRef.current);
      for (const p of room.remoteParticipants.values()) {
        if (!isPluginParticipant(p)) continue;
        for (const pub of p.audioTrackPublications.values()) {
          if (pub.track instanceof RemoteAudioTrack) pub.track.setVolume(volume);
        }
      }
    };

    const sincronizar = () => {
      const p = room.getParticipantByIdentity(identidadeAtiva) as RemoteParticipant | undefined;
      setParticipante(p ?? null);
      setEstado(p ? decodePluginState(p.attributes) : null);
      if (p) {
        setChamando(false);
        setSemResposta(false);
      }
      aplicarVolume();
    };

    const aoMudarAtributos = (_: Record<string, string>, p: { identity: string }) => {
      if (p.identity !== identidadeAtiva) return;
      setPendente(false);
      setNaoConfirmou(false);
      sincronizar();
    };

    const aoSair = (p: RemoteParticipant) => {
      if (p.identity !== identidadeAtiva) return;
      setAviso('O plugin saiu do comboio.');
      sincronizar();
    };

    room
      .on(RoomEvent.ParticipantConnected, sincronizar)
      .on(RoomEvent.ParticipantDisconnected, aoSair)
      .on(RoomEvent.ParticipantAttributesChanged, aoMudarAtributos)
      .on(RoomEvent.TrackSubscribed, aplicarVolume);
    sincronizar();

    return () => {
      room
        .off(RoomEvent.ParticipantConnected, sincronizar)
        .off(RoomEvent.ParticipantDisconnected, aoSair)
        .off(RoomEvent.ParticipantAttributesChanged, aoMudarAtributos)
        .off(RoomEvent.TrackSubscribed, aplicarVolume);
    };
  }, [room, identidadeAtiva]);

  // Reaplica quando a pessoa muda o volume, silencia ou volta a ouvir.
  useEffect(() => {
    if (!room) return;
    const efetivo = pluginPlaybackVolume(volume, silenciadoPorMim);
    for (const p of room.remoteParticipants.values()) {
      if (!isPluginParticipant(p)) continue;
      for (const pub of p.audioTrackPublications.values()) {
        if (pub.track instanceof RemoteAudioTrack) pub.track.setVolume(efetivo);
      }
    }
  }, [room, silenciadoPorMim, volume]);

  // Chamou e o plugin não apareceu: o computador provavelmente está desligado.
  useEffect(() => {
    if (!chamando) return;
    const t = setTimeout(() => {
      setChamando(false);
      setSemResposta(true);
    }, ESPERA_ENTRADA_MS);
    return () => clearTimeout(t);
  }, [chamando]);

  useEffect(() => {
    if (!pendente) return;
    const t = setTimeout(() => {
      setPendente(false);
      setNaoConfirmou(true);
    }, ESPERA_CONFIRMACAO_MS);
    return () => clearTimeout(t);
  }, [pendente]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 8_000);
    return () => clearTimeout(t);
  }, [aviso]);

  const chamar = useCallback(async () => {
    if (!plugin || !sessionToken) return;
    setSemResposta(false);
    setChamando(true);
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'convidar', token: sessionToken, plugin: plugin.id }),
      });
      if (!r.ok) {
        setChamando(false);
        setSemResposta(true);
      }
    } catch {
      setChamando(false);
      setSemResposta(true);
    }
  }, [plugin, sessionToken]);

  const cancelar = useCallback(() => setChamando(false), []);

  /**
   * Vincula este comboio ao plugin dono do código. Depois disso todo mundo
   * na sala vê o card — os outros descobrem na próxima consulta (até 15 s).
   * Devolve a mensagem de erro, ou null se deu certo.
   */
  const parear = useCallback(
    async (codigo: string): Promise<string | null> => {
      if (!sessionToken) return 'Entre no comboio primeiro.';
      try {
        const r = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: 'parear', token: sessionToken, codigo }),
        });
        const corpo = (await r.json().catch(() => ({}))) as {
          plugin?: AvailablePlugin;
          error?: string;
        };
        if (!r.ok || !corpo.plugin) return corpo.error || 'Não deu para conectar agora.';
        const novo = corpo.plugin;
        setPlugins((lista) => [...lista.filter((p) => p.id !== novo.id), novo]);
        setAtivoId(novo.id); // o recém-conectado passa a ser o do card
        setChamando(false);
        setSemResposta(false);
        return null;
      } catch {
        return 'Sem conexão com o MotoRede.';
      }
    },
    [sessionToken]
  );

  /**
   * Desvincula o plugin ativo deste comboio: ele some para todo mundo aqui.
   * Se estiver na sala, é dispensado antes. Para voltar, alguém digita o
   * código de novo.
   */
  const desparear = useCallback(async () => {
    if (!plugin || !sessionToken) return;
    const alvo = plugin;
    if (room && participante) {
      try {
        const mensagem: PluginMessage = { plugin: alvo.id, comando: { tipo: 'sair' } };
        await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(mensagem)), {
          reliable: true,
          topic: PLUGIN_TOPIC,
          destinationIdentities: [alvo.identidade],
        });
      } catch {
        // sem problema: desvincular vale mesmo se o plugin não ouvir
      }
    }
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'desparear', token: sessionToken, plugin: alvo.id }),
      });
    } finally {
      setPlugins((lista) => lista.filter((p) => p.id !== alvo.id));
      setAtivoId(null);
      setChamando(false);
      setSemResposta(false);
    }
  }, [plugin, sessionToken, room, participante]);

  /** Escolhe qual plugin o card controla (quando há mais de um). */
  const selecionar = useCallback((id: string) => {
    setAtivoId(id);
    setChamando(false);
    setSemResposta(false);
  }, []);

  const enviar = useCallback(
    async (comando: PluginCommand) => {
      if (!room || !plugin || !participante) return;
      const mensagem: PluginMessage = { plugin: plugin.id, comando };
      setNaoConfirmou(false);
      setPendente(true);
      try {
        await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(mensagem)), {
          reliable: true,
          topic: PLUGIN_TOPIC,
          destinationIdentities: [plugin.identidade],
        });
      } catch {
        setPendente(false);
        setNaoConfirmou(true);
      }
    },
    [room, plugin, participante]
  );

  const fase: PluginPhase = !plugin
    ? 'indisponivel'
    : participante
      ? 'na-sala'
      : chamando
        ? 'chamando'
        : semResposta
          ? 'sem-resposta'
          : 'fora';

  return {
    fase,
    plugin,
    plugins,
    selecionar,
    estado,
    aviso,
    pendente,
    naoConfirmou,
    silenciadoPorMim,
    setSilenciadoPorMim,
    volume,
    setVolume,
    chamar,
    cancelar,
    enviar,
    parear,
    desparear,
    identidadeLocal: room?.localParticipant.identity ?? null,
  };
}

export type PluginAudio = ReturnType<typeof usePluginAudio>;
