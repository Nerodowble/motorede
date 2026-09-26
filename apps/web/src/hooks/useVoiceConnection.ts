import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioPresets,
  ConnectionState,
  Participant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import {
  isPluginParticipant,
  toVoiceParticipants,
  VOICE_CAPTURE_DEFAULTS,
  VOICE_PUBLISH_DEFAULTS,
  type VoiceParticipant,
} from '@motorede/shared';

/**
 * Traduz a falha do microfone para algo que a pessoa consiga resolver.
 *
 * O navegador devolve nomes técnicos em inglês ("NotAllowedError: The request
 * is not allowed by the user agent..."), que no celular de um amigo não dizem
 * nada. O caso mais comum é o iPhone negar a permissão.
 */
export function explicarErroMicrofone(err: unknown): string {
  const nome = err instanceof Error ? err.name : '';
  const iPhone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  switch (nome) {
    case 'NotAllowedError':
    case 'SecurityError':
      return iPhone
        ? 'O iPhone bloqueou o microfone. Toque em "aA" na barra de endereço → Ajustes do Site → Microfone → Permitir (ou Ajustes → Safari → Microfone). Depois toque no botão do microfone.'
        : 'O navegador bloqueou o microfone. Libere a permissão no cadeado da barra de endereço e toque no botão do microfone.';
    case 'NotReadableError':
    case 'AbortError':
      return 'O microfone está ocupado por outro app (uma ligação, gravador, outro navegador). Feche e toque no botão do microfone.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Nenhum microfone encontrado neste aparelho.';
    default:
      return `Não deu para abrir o microfone${err instanceof Error && err.message ? `: ${err.message}` : '.'}`;
  }
}

export type VoiceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

interface ConnectOptions {
  /** Código da sala do comboio, ex.: "SERRA-88". */
  roomCode: string;
  /** Identificador único deste piloto. */
  identity: string;
  /** Nome exibido aos outros. */
  displayName: string;
  /** Token do Google, quando houver login. O servidor usa ele como identidade. */
  idToken?: string | null;
  /** Telefone, só para o servidor derivar a impressão digital da busca. */
  phone?: string;
}

interface UseVoiceConnection {
  status: VoiceConnectionStatus;
  error: string | null;
  participants: VoiceParticipant[];
  isMuted: boolean;
  /** true quando o navegador bloqueou o áudio e falta um gesto do usuário. */
  needsAudioUnlock: boolean;
  /** Host do servidor de voz em uso. Exibido para que uma divergência entre
   *  app e web (servidores diferentes) seja vista, e não silenciosa. */
  serverHost: string | null;
  /** Sala conectada, para quem precisa de eventos dela (painel de plugins). */
  room: Room | null;
  /** Token desta sessão. Prova ao servidor em qual comboio a pessoa está. */
  sessionToken: string | null;
  /** Volume de reprodução dos outros pilotos, 0 a 100. */
  volume: number;
  connect: (options: ConnectOptions) => Promise<void>;
  disconnect: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  setVolume: (volume: number) => void;
  unlockAudio: () => Promise<void>;
}

/**
 * Conexão de voz do comboio contra um servidor LiveKit.
 *
 * Expõe a lista de participantes já no formato `VoiceParticipant` que as telas
 * existentes consomem, de modo que a interface não precise saber que existe
 * LiveKit por trás. A mesma lógica é reaproveitada no app React Native — só a
 * camada de mídia muda.
 */
export function useVoiceConnection(): UseVoiceConnection {
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);

  const [status, setStatus] = useState<VoiceConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [serverHost, setServerHost] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(100);
  const [room, setRoom] = useState<Room | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Contêiner oculto onde os elementos <audio> dos outros pilotos são anexados.
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'motorede-voice-audio';
    container.style.display = 'none';
    document.body.appendChild(container);
    audioContainerRef.current = container;

    return () => {
      container.remove();
      audioContainerRef.current = null;
    };
  }, []);

  const syncParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setParticipants([]);
      return;
    }

    const all: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()];
    setParticipants(toVoiceParticipants(all));
  }, []);

  const attachTrack = useCallback((track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio) return;
    const element = track.attach();
    audioContainerRef.current?.appendChild(element);
  }, []);

  const connect = useCallback(
    async ({ roomCode, identity, displayName, idToken, phone }: ConnectOptions) => {
      if (roomRef.current) return;

      setStatus('connecting');
      setError(null);
      let entrando: Room | null = null;

      try {
        // O navegador só expõe o microfone em "contexto seguro": https, ou
        // localhost. Num IP de rede via http, navigator.mediaDevices simplesmente
        // não existe, e o erro nativo ("Cannot read properties of undefined")
        // não diz nada sobre a causa real.
        if (!navigator.mediaDevices?.getUserMedia) {
          // Em https isso só acontece em navegador embutido (Instagram,
          // WhatsApp, Facebook), que não dá acesso ao microfone.
          throw new Error(
            window.isSecureContext
              ? 'Este navegador não dá acesso ao microfone. Se abriu pelo WhatsApp ou Instagram, ' +
                  'use "Abrir no navegador" (Safari ou Chrome).'
              : 'Microfone indisponível: o navegador exige contexto seguro. ' +
                  'Neste computador use http://localhost:3000. ' +
                  'No celular, libere este endereço em chrome://flags → ' +
                  '"Insecure origins treated as secure".'
          );
        }

        const response = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomCode, identity, name: displayName, idToken, phone }),
        });

        if (!response.ok) {
          throw new Error(`servidor de token respondeu ${response.status}`);
        }

        const { token, url } = (await response.json()) as { token: string; url: string };
        setServerHost(url.replace(/^wss?:\/\//, '').split('/')[0]);

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: VOICE_CAPTURE_DEFAULTS,
          publishDefaults: {
            ...VOICE_PUBLISH_DEFAULTS,
            // Preset de voz: bitrate baixo, suficiente para fala.
            audioPreset: AudioPresets.speech,
          },
        });

        room
          .on(RoomEvent.ParticipantConnected, syncParticipants)
          .on(RoomEvent.ParticipantDisconnected, syncParticipants)
          .on(RoomEvent.ActiveSpeakersChanged, syncParticipants)
          .on(RoomEvent.TrackMuted, syncParticipants)
          .on(RoomEvent.TrackUnmuted, syncParticipants)
          .on(RoomEvent.LocalTrackPublished, syncParticipants)
          .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
            attachTrack(track);
            syncParticipants();
          })
          .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication) => {
            track.detach().forEach((el) => el.remove());
            syncParticipants();
          })
          .on(RoomEvent.AudioPlaybackStatusChanged, () => {
            setNeedsAudioUnlock(!room.canPlaybackAudio);
          })
          .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            if (state === ConnectionState.Reconnecting) setStatus('reconnecting');
            else if (state === ConnectionState.Connected) setStatus('connected');
          })
          .on(RoomEvent.Disconnected, () => {
            setStatus('disconnected');
            setParticipants([]);
            roomRef.current = null;
            setRoom(null);
            setSessionToken(null);
          });

        entrando = room;
        await room.connect(url, token);

        // Dentro da sala a partir daqui. Registrar ANTES do microfone: se ele
        // falhar, a pessoa continua no comboio ouvindo — e o app sabe disso.
        // Antes, uma falha aqui abandonava a sala sem sair dela: quem estava
        // no iPhone ouvia todo mundo, aparecia como mudo para os outros, e a
        // própria tela dizia que não tinha conectado.
        roomRef.current = room;
        setRoom(room);
        setSessionToken(token);
        setNeedsAudioUnlock(!room.canPlaybackAudio);
        setStatus('connected');

        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMuted(false);
        } catch (errMic) {
          setIsMuted(true);
          setError(explicarErroMicrofone(errMic));
        }
        syncParticipants();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus('error');
        roomRef.current = null;
        // Se chegou a entrar, sai de verdade: nada de conexão fantasma.
        void entrando?.disconnect();
      }
    },
    [attachTrack, syncParticipants]
  );

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.disconnect();
    roomRef.current = null;
    setRoom(null);
    setSessionToken(null);
    setStatus('disconnected');
    setParticipants([]);
  }, []);

  const setMuted = useCallback(async (muted: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!muted);
      setIsMuted(muted);
      setError(null);
    } catch (err) {
      // Abrir o microfone pode falhar (permissão negada): continua mudo e diz por quê.
      setIsMuted(true);
      setError(explicarErroMicrofone(err));
    }
  }, []);

  /**
   * Ajusta o volume de todos os participantes remotos.
   *
   * O volume não é uma propriedade da sala: é aplicado por participante. Quem
   * entrar depois precisa receber o mesmo valor, por isso reaplicamos também
   * quando a lista muda.
   */
  const applyVolume = useCallback((value: number) => {
    const room = roomRef.current;
    if (!room) return;
    // Plugins ficam de fora: o volume da música é do painel de música (abaixa
    // quando alguém fala, silencia só para mim), não deste controle.
    room.remoteParticipants.forEach((p) => {
      if (!isPluginParticipant(p)) p.setVolume(value / 100);
    });
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      setVolumeState(value);
      applyVolume(value);
    },
    [applyVolume]
  );

  // Participante novo entra com o volume que o piloto já escolheu.
  useEffect(() => {
    applyVolume(volume);
  }, [participants, volume, applyVolume]);

  /**
   * Navegadores bloqueiam áudio até haver um gesto do usuário. Chamado a partir
   * de um clique, isto libera a reprodução.
   */
  const unlockAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.startAudio();
    setNeedsAudioUnlock(!room.canPlaybackAudio);
  }, []);

  // Desconecta ao desmontar, para não deixar a sala aberta e o microfone ligado.
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  return {
    status,
    error,
    participants,
    isMuted,
    needsAudioUnlock,
    serverHost,
    room,
    sessionToken,
    volume,
    connect,
    disconnect,
    setMuted,
    setVolume,
    unlockAudio,
  };
}
