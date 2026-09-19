import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerGlobals } from '@livekit/react-native';
import {
  generateRoomCode,
  isJoinableRoomCode,
  normalizeRoomCode,
} from '@motorede/shared';
import { useVoiceConnection } from './src/hooks/useVoiceConnection';
import { DEV_ROOM_CODE, TOKEN_ENDPOINT, WEB_APP_URL } from './src/config';

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
  // Nada de manter a tela acesa: bloquear o aparelho e seguir conversando é
  // justamente o comportamento que o app precisa sustentar.
  const [permissionDenied, setPermissionDenied] = useState(false);

  // O comboio ativo vive apenas em memória. Persistir exigiria AsyncStorage,
  // que é módulo nativo e obrigaria um novo build a cada ajuste — não vale o
  // custo agora. Entra junto com o Supabase, quando houver conta de usuário.
  const [activeRoomCode, setActiveRoomCode] = useState(DEV_ROOM_CODE);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const voice = useVoiceConnection(TOKEN_ENDPOINT);
  const isLive = voice.status === 'connected' || voice.status === 'reconnecting';

  useEffect(() => {
    void requestMicrophonePermission().then((ok) => setPermissionDenied(!ok));
  }, []);

  // Convite por link: motorede://sala/K7M-3PQ ou motorede://?sala=K7M-3PQ.
  // O scheme já está declarado no app.json e embutido no APK, então isto é só
  // JavaScript — recarrega pelo Metro, sem build novo.
  useEffect(() => {
    const applyUrl = (url: string | null) => {
      if (!url) return;
      const match = url.match(/(?:[?&]sala=|sala\/)([^&?/#]+)/i);
      if (!match) return;
      const normalized = normalizeRoomCode(decodeURIComponent(match[1]));
      if (isJoinableRoomCode(normalized)) enterRoom(normalized);
    };

    // App aberto pelo link a partir do estado encerrado.
    void Linking.getInitialURL().then(applyUrl);

    // App já estava aberto quando o link foi tocado.
    const sub = Linking.addEventListener('url', ({ url }) => applyUrl(url));
    return () => sub.remove();
  }, []);

  const enterRoom = (code: string) => {
    setActiveRoomCode(code);
    setCodeInput('');
    setCodeError(null);
  };

  const handleJoinByCode = () => {
    const normalized = normalizeRoomCode(codeInput);
    if (!isJoinableRoomCode(normalized)) {
      setCodeError('Código inválido. Confira com quem te passou.');
      return;
    }
    enterRoom(normalized);
  };

  const handleShare = async () => {
    await Share.share({
      message: `Entra no meu comboio no MotoRede: ${WEB_APP_URL}/?sala=${activeRoomCode}\n\nCódigo: ${activeRoomCode}`,
    });
  };

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
      roomCode: activeRoomCode,
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
        <Text style={styles.subtitle}>Comboio por voz</Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
            {voice.status === 'connecting' && (
              <ActivityIndicator size="small" color={COLORS.accent} />
            )}
          </View>

          {voice.serverHost && (
            <Text style={styles.serverLine} numberOfLines={1}>
              servidor: {voice.serverHost}
            </Text>
          )}

          {voice.error && <Text style={styles.error}>{voice.error}</Text>}

          {permissionDenied && (
            <Text style={styles.error}>
              Permissão de microfone negada. Libere nas configurações do aparelho.
            </Text>
          )}

          <View style={styles.roomRow}>
            <View style={styles.roomInfo}>
              <Text style={styles.roomLabel}>COMBOIO</Text>
              <Text style={styles.roomCode}>{activeRoomCode}</Text>
            </View>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.smallButtonText}>Convidar</Text>
            </Pressable>
          </View>

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
              {isLive ? 'Sair do comboio' : 'Entrar no comboio'}
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

        {/* Trocar de comboio some durante a conversa: não se oferece isso a
            alguém pilotando. */}
        {!isLive && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Trocar de comboio</Text>

            <View style={styles.joinRow}>
              <TextInput
                value={codeInput}
                onChangeText={(t) => {
                  setCodeInput(t);
                  setCodeError(null);
                }}
                placeholder="Código (ex: K7M-3PQ)"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
                onSubmitEditing={handleJoinByCode}
                returnKeyType="go"
              />
              <Pressable
                onPress={handleJoinByCode}
                disabled={!codeInput.trim()}
                style={({ pressed }) => [
                  styles.smallButton,
                  !codeInput.trim() && styles.disabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.smallButtonText}>Entrar</Text>
              </Pressable>
            </View>

            {codeError && <Text style={styles.error}>{codeError}</Text>}

            <Pressable
              onPress={() => enterRoom(generateRoomCode())}
              style={({ pressed }) => [
                styles.button,
                styles.buttonSecondary,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonSecondaryText}>Criar comboio novo</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Integrantes ({voice.participants.length})
          </Text>

          {voice.participants.length === 0 && (
            <Text style={styles.muted}>Ninguém conectado ainda.</Text>
          )}

          {voice.participants.map((p) => (
            <View key={p.id} style={styles.participantRow}>
              <View
                style={[styles.avatar, p.isSpeaking && { backgroundColor: COLORS.accent }]}
              >
                <Text
                  style={[styles.avatarText, p.isSpeaking && { color: COLORS.background }]}
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
  serverLine: { color: COLORS.muted, fontSize: 10, marginTop: -6 },
  roomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomInfo: { flex: 1 },
  roomLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  roomCode: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: Platform.select({ android: 'monospace', default: undefined }),
  },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonJoin: { backgroundColor: COLORS.accent },
  buttonLeave: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  buttonSecondary: { backgroundColor: COLORS.border },
  smallButton: {
    backgroundColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  smallButtonText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: COLORS.background, fontSize: 14, fontWeight: '800' },
  buttonTextLeave: { color: COLORS.danger },
  buttonSecondaryText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
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
});
