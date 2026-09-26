import type { VoiceParticipant } from '../types.js';
import { PLUGIN_IDENTITY_PREFIX } from './plugins.js';

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
 * true quando o participante é um plugin, e não um piloto.
 *
 * Decide pela identidade, que só o servidor define. O metadado não serve: o
 * plugin tem permissão de atualizar os próprios dados (para publicar o que
 * está tocando) e poderia apagar a marca para se passar por piloto.
 */
export function isPluginParticipant(p: { identity: string }): boolean {
  return p.identity.startsWith(PLUGIN_IDENTITY_PREFIX);
}

/**
 * Converte os participantes da camada de mídia para o formato que as telas
 * consomem.
 *
 * Enquanto não existe um dono declarado da sala, quem entrou primeiro é
 * tratado como líder do comboio.
 *
 * Plugins ficam de fora: não são pilotos, não podem virar líder e têm painel
 * próprio na tela.
 */
export function toVoiceParticipants(all: VoiceSourceParticipant[]): VoiceParticipant[] {
  const source = all.filter((p) => !isPluginParticipant(p));
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
