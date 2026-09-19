import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerGlobals } from '@livekit/react-native';
import { useVoiceConnection } from './src/hooks/useVoiceConnection';
import { DEV_ROOM_CODE, TOKEN_ENDPOINT } from './src/config';

// Instala as APIs de WebRTC no ambiente do React Native. Precisa rodar uma vez,
// antes de qualquer uso do LiveKit.
registerGlobals();

const COLORS = {
  background: '#020617',
  surface: '#0f172a',
  border: '#1e293b',
  text: '#f1f5f9',
  muted: '#94a3b8',
  accent: '#f59e0b',
  success: '#34d399',
  danger: '#f87171',
};

async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microfone',
      message: 'O MotoRede precisa do microfone para a conversa do comboio.',
      buttonPositive: 'Permitir',
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export default function App() {
  // Nada de manter a tela acesa: o teste é justamente bloquear o aparelho e
  // verificar se o áudio continua.
  const [permissionDenied, setPermissionDenied] = useState(false);
  const voice = useVoiceConnection(TOKEN_ENDPOINT);

  const isLive = voice.status === 'connected' || voice.status === 'reconnecting';

  useEffect(() => {
    void requestMicrophonePermission().then((ok) => setPermissionDenied(!ok));
  }, []);

  const handleToggle = async () => {
    if (isLive) {
      await voice.disconnect();
      return;
    }
    const ok = await requestMicrophonePermission();
    if (!ok) {
      setPermissionDenied(true);
      return;
    }
    await voice.connect({
      roomCode: DEV_ROOM_CODE,
      identity: `piloto-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Piloto (app)',
    });
  };

  const statusLabel = {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    connected: 'Ao vivo',
    reconnecting: 'Reconectando...',
    error: 'Falha ao conectar',
  }[voice.status];

  const statusColor =
    voice.status === 'connected'
      ? COLORS.success
      : voice.status === 'error'
        ? COLORS.danger
        : voice.status === 'disconnected'
          ? COLORS.muted
          : COLORS.accent;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>MotoRede</Text>
        <Text style={styles.subtitle}>Comboio por voz · canal {DEV_ROOM_CODE}</Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
            {voice.status === 'connecting' && (
              <ActivityIndicator size="small" color={COLORS.accent} />
            )}
          </View>

          {voice.error && <Text style={styles.error}>{voice.error}</Text>}

          {permissionDenied && (
            <Text style={styles.error}>
              Permissão de microfone negada. Libere nas configurações do aparelho.
            </Text>
          )}

          <Pressable
            onPress={handleToggle}
            disabled={voice.status === 'connecting'}
            style={({ pressed }) => [
              styles.button,
              isLive ? styles.buttonLeave : styles.buttonJoin,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, isLive && styles.buttonTextLeave]}>
              {isLive ? 'Sair do canal' : 'Entrar no canal'}
            </Text>
          </Pressable>

          {isLive && (
            <Pressable
              onPress={() => voice.setMuted(!voice.isMuted)}
              style={({ pressed }) => [
                styles.button,
                styles.buttonSecondary,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonSecondaryText}>
                {voice.isMuted ? 'Reativar microfone' : 'Silenciar microfone'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Integrantes no comboio ({voice.participants.length})
          </Text>

          {voice.participants.length === 0 && (
            <Text style={styles.muted}>Ninguém conectado ainda.</Text>
          )}

          {voice.participants.map((p) => (
            <View key={p.id} style={styles.participantRow}>
              <View
                style={[
                  styles.avatar,
                  p.isSpeaking && { backgroundColor: COLORS.accent },
                ]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    p.isSpeaking && { color: COLORS.background },
                  ]}
                >
                  {p.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>
                  {p.name}
                  {p.isHost ? ' · líder' : ''}
                </Text>
                <Text style={styles.muted}>
                  {p.isMuted ? 'microfone mudo' : p.isSpeaking ? 'falando' : 'ouvindo'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.hint}>
          Teste principal: entre no canal, bloqueie a tela e continue falando. O áudio
          precisa seguir funcionando — é justamente o que o navegador não faz.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 16 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: -12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 17 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonJoin: { backgroundColor: COLORS.accent },
  buttonLeave: { backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
  buttonSecondary: { backgroundColor: '#1e293b' },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: COLORS.background, fontSize: 14, fontWeight: '800' },
  buttonTextLeave: { color: COLORS.danger },
  buttonSecondaryText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  sectionTitle: { color: COLORS.text, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  muted: { color: COLORS.muted, fontSize: 12 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.text, fontWeight: '800' },
  participantInfo: { flex: 1 },
  participantName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  hint: { color: COLORS.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
});
