import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioSession } from '@livekit/react-native';
import {
  AudioPresets,
  ConnectionState,
  Participant,
  Room,
  RoomEvent,
} from 'livekit-client';
import {
  toVoiceParticipants,
  VOICE_CAPTURE_DEFAULTS,
  VOICE_PUBLISH_DEFAULTS,
  type VoiceParticipant,
} from '@motorede/shared';
import {
  startVoiceForegroundService,
  stopVoiceForegroundService,
} from '../services/foregroundService';

export type VoiceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

interface ConnectOptions {
  roomCode: string;
  identity: string;
  displayName: string;
}

interface UseVoiceConnection {
  status: VoiceConnectionStatus;
  error: string | null;
  participants: VoiceParticipant[];
  isMuted: boolean;
  connect: (options: ConnectOptions) => Promise<void>;
  disconnect: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
}

/**
 * Conexão de voz do comboio no app nativo.
 *
 * Espelha o hook da web e compartilha com ele o mapeamento de participantes e
 * os ajustes de áudio (`@motorede/shared`). As diferenças são justamente o que
 * motivou o app nativo:
 *
 * - `AudioSession` configura a sessão de áudio do sistema operacional. É o que
 *   permite continuar capturando o microfone com a tela bloqueada — exatamente
 *   o que o navegador não faz.
 * - Não há elementos `<audio>` para anexar: a reprodução é nativa.
 */
export function useVoiceConnection(tokenEndpoint: string): UseVoiceConnection {
  const roomRef = useRef<Room | null>(null);

  const [status, setStatus] = useState<VoiceConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const syncParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setParticipants([]);
      return;
    }
    const all: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()];
    setParticipants(toVoiceParticipants(all));
  }, []);

  const connect = useCallback(
    async ({ roomCode, identity, displayName }: ConnectOptions) => {
      if (roomRef.current) return;

      setStatus('connecting');
      setError(null);

      try {
        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomCode, identity, name: displayName }),
        });

        if (!response.ok) {
          throw new Error(`servidor de token respondeu ${response.status}`);
        }

        const { token, url } = (await response.json()) as { token: string; url: string };

        // Sobe o serviço em primeiro plano ANTES de conectar. O Android exige
        // que ele seja iniciado enquanto o app ainda está visível; começar
        // depois, com a tela já apagada, é recusado pelo sistema.
        await startVoiceForegroundService(roomCode);

        // Prepara a sessão de áudio do sistema. É o que roteia para o fone
        // bluetooth e mantém o áudio ativo em segundo plano.
        await AudioSession.startAudioSession();

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: VOICE_CAPTURE_DEFAULTS,
          publishDefaults: {
            ...VOICE_PUBLISH_DEFAULTS,
            audioPreset: AudioPresets.speech,
          },
        });

        room
          .on(RoomEvent.ParticipantConnected, syncParticipants)
          .on(RoomEvent.ParticipantDisconnected, syncParticipants)
          .on(RoomEvent.ActiveSpeakersChanged, syncParticipants)
          .on(RoomEvent.TrackMuted, syncParticipants)
          .on(RoomEvent.TrackUnmuted, syncParticipants)
          .on(RoomEvent.TrackSubscribed, syncParticipants)
          .on(RoomEvent.TrackUnsubscribed, syncParticipants)
          .on(RoomEvent.LocalTrackPublished, syncParticipants)
          .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            if (state === ConnectionState.Reconnecting) setStatus('reconnecting');
            else if (state === ConnectionState.Connected) setStatus('connected');
          })
          .on(RoomEvent.Disconnected, () => {
            setStatus('disconnected');
            setParticipants([]);
            roomRef.current = null;
            void AudioSession.stopAudioSession();
            void stopVoiceForegroundService();
          });

        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(true);

        roomRef.current = room;
        setIsMuted(false);
        setStatus('connected');
        syncParticipants();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus('error');
        roomRef.current = null;
        await AudioSession.stopAudioSession();
        await stopVoiceForegroundService();
      }
    },
    [syncParticipants, tokenEndpoint]
  );

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.disconnect();
    roomRef.current = null;
    setStatus('disconnected');
    setParticipants([]);
    await AudioSession.stopAudioSession();
    await stopVoiceForegroundService();
  }, []);

  const setMuted = useCallback(async (muted: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(!muted);
    setIsMuted(muted);
  }, []);

  useEffect(() => {
    return () => {
      void roomRef.current?.disconnect();
      roomRef.current = null;
      void AudioSession.stopAudioSession();
      void stopVoiceForegroundService();
    };
  }, []);

  return { status, error, participants, isMuted, connect, disconnect, setMuted };
}
