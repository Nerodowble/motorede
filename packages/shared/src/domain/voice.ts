import type { VoiceParticipant } from '../types.js';

/**
 * Forma mínima de um participante vinda da camada de mídia.
 *
 * Declarada estruturalmente de propósito: o objeto `Participant` do
 * livekit-client encaixa aqui sem que este pacote precise depender do
 * livekit-client. Assim o domínio continua puro e serve web, app e servidor.
 */
export interface VoiceSourceParticipant {
  identity: string;
  name?: string;
  isSpeaking: boolean;
  isMicrophoneEnabled: boolean;
  audioLevel?: number;
  joinedAt?: Date;
}

/**
 * Converte os participantes da camada de mídia para o formato que as telas
 * consomem.
 *
 * Enquanto não existe um dono declarado da sala, quem entrou primeiro é
 * tratado como líder do comboio.
 */
export function toVoiceParticipants(source: VoiceSourceParticipant[]): VoiceParticipant[] {
  const hostIdentity = source
    .slice()
    .sort((a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0))[0]?.identity;

  return source.map((p) => ({
    id: p.identity,
    name: p.name || p.identity,
    isHost: p.identity === hostIdentity,
    isSpeaking: p.isSpeaking,
    isMuted: !p.isMicrophoneEnabled,
    volume: Math.round((p.audioLevel ?? 0) * 100),
    deviceType: 'headset',
  }));
}

/**
 * Ajustes de publicação de áudio usados por web e app.
 *
 * - `dtx`: não transmite enquanto ninguém fala. Num comboio as pessoas ficam
 *   caladas a maior parte do tempo, então isso corta a maior parte do tráfego.
 * - `red`: reenvia pacotes anteriores junto com os novos. Em 4G de estrada a
 *   perda de pacote é a regra, não a exceção.
 *
 * O preset de bitrate fica a cargo de cada plataforma, porque a constante vem
 * da biblioteca de mídia correspondente.
 */
export const VOICE_PUBLISH_DEFAULTS = {
  dtx: true,
  red: true,
} as const;

/** Captura de microfone adequada para uso dentro de um capacete. */
export const VOICE_CAPTURE_DEFAULTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
} as const;
