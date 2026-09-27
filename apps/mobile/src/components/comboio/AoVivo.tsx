import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { VoiceParticipant } from '@motorede/shared';
import type { VoiceConnectionStatus } from '../../hooks/useVoiceConnection';
import { ALVO, COLORS, ESPACO, RAIO, TIPO } from '../../theme';
import { Cartao, EstadoVazio, Rotulo } from '../ui/Cartao';
import { BotaoIcone } from '../ui/Botao';

/**
 * As peças da tela do comboio CONECTADO, na ordem em que o piloto olha:
 * estado + quem fala, microfone, participantes.
 *
 * Âmbar é só "falando" e verde é só "microfone aberto" — por isso o estado
 * "conectando" é neutro, e não âmbar como antes.
 */

const ROTULO_STATUS: Record<VoiceConnectionStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando…',
  connected: 'Ao vivo',
  reconnecting: 'Reconectando…',
  error: 'Falha ao conectar',
};

export function corDoStatus(status: VoiceConnectionStatus): string {
  if (status === 'connected') return COLORS.live;
  if (status === 'error') return COLORS.dangerText;
  return COLORS.inkFaint;
}

/** Linha de estado: bolinha, rótulo e, se estiver conectando, o giro. */
export const LinhaStatus: React.FC<{ status: VoiceConnectionStatus }> = ({ status }) => (
  <View style={styles.linhaStatus}>
    <View style={[styles.ponto, { backgroundColor: corDoStatus(status) }]} />
    <Text style={[styles.status, status === 'error' && { color: COLORS.dangerText }]}>
      {ROTULO_STATUS[status]}
    </Text>
    {(status === 'connecting' || status === 'reconnecting') && (
      <ActivityIndicator size="small" color={COLORS.inkMuted} />
    )}
  </View>
);

/** (1) Estado ao vivo e quem está falando agora. */
export const CartaoAoVivo: React.FC<{
  status: VoiceConnectionStatus;
  codigo: string;
  participantes: VoiceParticipant[];
  erro: string | null;
  aoConvidar: () => void;
}> = ({ status, codigo, participantes, erro, aoConvidar }) => {
  const falando = participantes.filter((p) => p.isSpeaking);
  return (
    <Cartao>
      <View style={styles.linhaTopo}>
        <View style={{ flex: 1, gap: ESPACO.xs }}>
          <LinhaStatus status={status} />
          <Text style={styles.codigoPequeno}>Comboio {codigo}</Text>
        </View>
        <BotaoIcone icone="share-social-outline" onPress={aoConvidar} rotulo="Convidar" />
      </View>

      <View style={[styles.falando, falando.length > 0 && styles.falandoAtivo]}>
        <Ionicons
          name={falando.length > 0 ? 'volume-high' : 'volume-mute-outline'}
          size={20}
          color={falando.length > 0 ? COLORS.speaking : COLORS.inkFaint}
        />
        <Text
          style={[styles.falandoTexto, falando.length > 0 && { color: COLORS.speaking }]}
          numberOfLines={1}
        >
          {falando.length > 0
            ? `${falando.map((p) => p.name).join(', ')} falando`
            : 'Ninguém falando agora'}
        </Text>
      </View>

      {erro && <Text style={styles.erro}>{erro}</Text>}
    </Cartao>
  );
};

/**
 * (2) O microfone. O maior alvo da tela: é o que se toca em movimento.
 * Verde cheio quando aberto; neutro com o ícone riscado quando mudo, para que
 * a diferença não dependa só da cor.
 */
export const BotaoMicrofone: React.FC<{ mudo: boolean; aoAlternar: () => void }> = ({
  mudo,
  aoAlternar,
}) => (
  <Pressable
    onPress={aoAlternar}
    accessibilityRole="switch"
    accessibilityState={{ checked: !mudo }}
    accessibilityLabel={mudo ? 'Microfone mudo. Tocar para abrir' : 'Microfone aberto. Tocar para silenciar'}
    style={({ pressed }) => [
      styles.mic,
      mudo ? styles.micMudo : styles.micAberto,
      pressed && { opacity: 0.8 },
    ]}
  >
    <View style={[styles.micIcone, mudo ? styles.micIconeMudo : styles.micIconeAberto]}>
      <Ionicons name={mudo ? 'mic-off' : 'mic'} size={30} color={mudo ? COLORS.ink : COLORS.onLive} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.micTitulo, { color: mudo ? COLORS.ink : COLORS.onLive }]}>
        {mudo ? 'Microfone mudo' : 'Microfone aberto'}
      </Text>
      <Text style={[styles.micSub, { color: mudo ? COLORS.inkMuted : COLORS.onLive }]}>
        {mudo ? 'Tocar para falar' : 'Tocar para silenciar'}
      </Text>
    </View>
  </Pressable>
);

/** (3) Quem está no comboio. Anel âmbar em volta de quem fala. */
export const CartaoParticipantes: React.FC<{ participantes: VoiceParticipant[] }> = ({
  participantes,
}) => (
  <Cartao>
    <Rotulo icone="people-outline">No comboio · {participantes.length}</Rotulo>
    {participantes.length === 0 ? (
      <EstadoVazio icone="people-outline" texto="Ninguém conectado ainda." />
    ) : (
      participantes.map((p) => (
        <View key={p.id} style={styles.participante}>
          <View style={[styles.anel, p.isSpeaking && styles.anelFalando]}>
            <View style={[styles.avatar, p.isSpeaking && styles.avatarFalando]}>
              <Text style={[styles.avatarTexto, p.isSpeaking && { color: COLORS.onSpeaking }]}>
                {p.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nome} numberOfLines={1}>
              {p.name}
            </Text>
            <Text
              style={[styles.estado, p.isSpeaking && { color: COLORS.speaking, fontWeight: '700' }]}
            >
              {p.isMuted ? 'mudo' : p.isSpeaking ? 'falando' : 'ouvindo'}
            </Text>
          </View>
          {p.isHost && (
            <View style={styles.selo}>
              <Ionicons name="flag" size={12} color={COLORS.inkMuted} />
              <Text style={styles.seloTexto}>líder</Text>
            </View>
          )}
          {p.isMuted && <Ionicons name="mic-off" size={18} color={COLORS.inkFaint} />}
        </View>
      ))
    )}
  </Cartao>
);

const styles = StyleSheet.create({
  linhaTopo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
  linhaStatus: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  status: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  codigoPequeno: { ...TIPO.apoio, letterSpacing: 1 },
  falando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    minHeight: ALVO.min,
    paddingHorizontal: ESPACO.md,
    borderRadius: RAIO.md,
    backgroundColor: COLORS.elevated,
  },
  falandoAtivo: { borderWidth: 1, borderColor: COLORS.speaking },
  falandoTexto: { color: COLORS.inkMuted, fontSize: 15, fontWeight: '600', flex: 1 },
  erro: { color: COLORS.dangerText, fontSize: 13, lineHeight: 18 },
  mic: {
    minHeight: ALVO.mic + 12,
    borderRadius: RAIO.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.lg,
    paddingHorizontal: ESPACO.lg,
    borderWidth: 1,
  },
  micAberto: { backgroundColor: COLORS.live, borderColor: COLORS.live },
  micMudo: { backgroundColor: COLORS.elevated, borderColor: COLORS.lineStrong },
  micIcone: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIconeAberto: { backgroundColor: COLORS.veuSobreCor },
  micIconeMudo: { backgroundColor: COLORS.surface },
  micTitulo: { fontSize: 20, fontWeight: '800' },
  micSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  participante: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, minHeight: 52 },
  anel: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anelFalando: { borderColor: COLORS.speaking },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFalando: { backgroundColor: COLORS.speaking },
  avatarTexto: { color: COLORS.ink, fontWeight: '800', fontSize: 16 },
  nome: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  estado: { color: COLORS.inkFaint, fontSize: 13 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.xs,
    paddingHorizontal: ESPACO.sm,
    paddingVertical: ESPACO.xs,
    borderRadius: RAIO.pill,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  seloTexto: { color: COLORS.inkMuted, fontSize: 12, fontWeight: '700' },
});
