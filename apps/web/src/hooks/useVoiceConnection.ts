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
  toVoiceParticipants,
  VOICE_CAPTURE_DEFAULTS,
  VOICE_PUBLISH_DEFAULTS,
  type VoiceParticipant,
} from '@motorede/shared';

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
    async ({ roomCode, identity, displayName, idToken }: ConnectOptions) => {
      if (roomRef.current) return;

      setStatus('connecting');
      setError(null);

      try {
        // O navegador só expõe o microfone em "contexto seguro": https, ou
        // localhost. Num IP de rede via http, navigator.mediaDevices simplesmente
        // não existe, e o erro nativo ("Cannot read properties of undefined")
        // não diz nada sobre a causa real.
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Microfone indisponível: o navegador exige contexto seguro. ' +
              'Neste computador use http://localhost:3000. ' +
              'No celular, libere este endereço em chrome://flags → ' +
              '"Insecure origins treated as secure".'
          );
        }

        const response = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomCode, identity, name: displayName, idToken }),
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
          });

        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(true);

        roomRef.current = room;
        setIsMuted(false);
        setNeedsAudioUnlock(!room.canPlaybackAudio);
        setStatus('connected');
        syncParticipants();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus('error');
        roomRef.current = null;
      }
    },
    [attachTrack, syncParticipants]
  );

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.disconnect();
    roomRef.current = null;
    setStatus('disconnected');
    setParticipants([]);
  }, []);

  const setMuted = useCallback(async (muted: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(!muted);
    setIsMuted(muted);
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
    room.remoteParticipants.forEach((p) => p.setVolume(value / 100));
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
    volume,
    connect,
    disconnect,
    setMuted,
    setVolume,
    unlockAudio,
  };
}
