import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CONVOY_CAPACITY,
  generateRoomCode,
  isJoinableRoomCode,
  normalizePhone,
  sortByUrgency,
  type VoiceParticipant,
} from '@motorede/shared';
import { useVoiceConnection } from '../hooks/useVoiceConnection';
import { useConvoyBrowser } from '../hooks/useConvoyBrowser';
import { useMusicPlugin } from '../hooks/useMusicPlugin';
import { MusicCard } from '../components/MusicCard';
import { storage } from '../services/storage';
import { TOKEN_ENDPOINT, WEB_APP_URL } from '../config';
import { COLORS } from '../theme';

/**
 * Comboio por voz — a tela principal do app.
 *
 * É a única que o piloto usa em movimento, então tudo que não serve para isso
 * fica escondido: trocar de comboio some durante a conversa, e o navegador de
 * comboios é um painel à parte.
 */

interface ConvoyScreenProps {
  roomCode: string;
  onChangeRoom: (codigo: string) => void;
  displayName: string;
  idToken: string | null;
}

export const ConvoyScreen: React.FC<ConvoyScreenProps> = ({
  roomCode,
  onChangeRoom,
  displayName,
  idToken,
}) => {
  const voice = useVoiceConnection(TOKEN_ENDPOINT);
  const browser = useConvoyBrowser();
  const isLive = voice.status === 'connected' || voice.status === 'reconnecting';
  const music = useMusicPlugin(voice.room, voice.sessionToken);
  const souLider = voice.participants.some(
    (p) => p.isHost && p.id === voice.room?.localParticipant.identity
  );

  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const [telefone, setTelefone] = useState('');
  const [painelAberto, setPainelAberto] = useState(false);
  const [buscaTelefone, setBuscaTelefone] = useState('');

  useEffect(() => {
    void storage.getPhone().then(setTelefone);
  }, []);

  useEffect(() => {
    if (painelAberto) void browser.refresh({ idToken });
  }, [painelAberto]);

  const entrar = async (codigo: string) => {
    // Nunca duas chamadas ao mesmo tempo: sai de uma para entrar na outra.
    if (isLive) await voice.disconnect();
    onChangeRoom(codigo);
    setPainelAberto(false);
    await voice.connect({
      roomCode: codigo,
      identity: `piloto-${Math.random().toString(36).slice(2, 8)}`,
      displayName,
      idToken,
      phone: telefone || undefined,
    });
  };

  const alternar = async () => {
    if (isLive) {
      await voice.disconnect();
      return;
    }
    await entrar(roomCode);
  };

  const convidar = () =>
    Share.share({
      message: `Entra no meu comboio no MotoRede\n\nCódigo: ${roomCode}\n${WEB_APP_URL}/?sala=${roomCode}`,
    });

  const entrarPorCodigo = () => {
    const normalizado = codigoDigitado.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!isJoinableRoomCode(normalizado)) {
      setErroCodigo('Código inválido. Confira com quem te passou.');
      return;
    }
    setCodigoDigitado('');
    setErroCodigo(null);
    onChangeRoom(normalizado);
  };

  const cor =
    voice.status === 'connected'
      ? COLORS.success
      : voice.status === 'error'
        ? COLORS.danger
        : voice.status === 'disconnected'
          ? COLORS.faint
          : COLORS.accent;

  const rotuloStatus = {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    connected: 'Ao vivo',
    reconnecting: 'Reconectando...',
    error: 'Falha ao conectar',
  }[voice.status];

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <View style={styles.card}>
        <View style={styles.linhaStatus}>
          <View style={[styles.ponto, { backgroundColor: cor }]} />
          <Text style={styles.status}>{rotuloStatus}</Text>
          {voice.status === 'connecting' && (
            <ActivityIndicator size="small" color={COLORS.accent} />
          )}
        </View>

        {voice.serverHost && (
          <Text style={styles.servidor}>servidor: {voice.serverHost}</Text>
        )}
        {voice.error && <Text style={styles.erro}>{voice.error}</Text>}

        <Text style={styles.rotulo}>COMBOIO</Text>
        <Text style={styles.codigo}>{roomCode}</Text>

        <View style={styles.linhaBotoes}>
          <Pressable onPress={convidar} style={styles.botaoSecundario}>
            <Text style={styles.botaoSecundarioTexto}>Convidar</Text>
          </Pressable>
          <Pressable onPress={() => setPainelAberto(true)} style={styles.botaoSecundario}>
            <Text style={styles.botaoSecundarioTexto}>Comboios</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={alternar}
          disabled={voice.status === 'connecting'}
          style={[styles.botaoPrincipal, isLive && styles.botaoSair]}
        >
          <Text style={[styles.botaoPrincipalTexto, isLive && { color: COLORS.danger }]}>
            {isLive ? 'Sair do comboio' : 'Entrar no comboio'}
          </Text>
        </Pressable>

        {isLive && (
          <Pressable
            onPress={() => voice.setMuted(!voice.isMuted)}
            style={[styles.botaoMic, voice.isMuted && styles.botaoMicMudo]}
          >
            <Text style={styles.botaoMicTexto}>
              {voice.isMuted ? 'Microfone mudo — tocar para abrir' : 'Microfone aberto'}
            </Text>
          </Pressable>
        )}
      </View>

      {isLive && <MusicCard music={music} souLider={souLider} />}

      {/* Trocar de comboio some durante a conversa: não se oferece isso a
          alguém pilotando. */}
      {!isLive && (
        <View style={styles.card}>
          <Text style={styles.rotulo}>TROCAR DE COMBOIO</Text>
          <View style={styles.linhaKm}>
            <TextInput
              value={codigoDigitado}
              onChangeText={(t) => {
                setCodigoDigitado(t);
                setErroCodigo(null);
              }}
              placeholder="Código (ex: K7M-3PQ)"
              placeholderTextColor={COLORS.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable onPress={entrarPorCodigo} style={styles.botaoPequeno}>
              <Text style={styles.botaoPequenoTexto}>Ir</Text>
            </Pressable>
          </View>
          {erroCodigo && <Text style={styles.erro}>{erroCodigo}</Text>}

          <Pressable
            onPress={() => onChangeRoom(generateRoomCode())}
            style={styles.botaoSecundario}
          >
            <Text style={styles.botaoSecundarioTexto}>Criar comboio novo</Text>
          </Pressable>

          <Text style={styles.rotuloCampo}>Seu telefone (para amigos te acharem)</Text>
          <TextInput
            value={telefone}
            onChangeText={(t) => {
              setTelefone(t);
              void storage.savePhone(t);
            }}
            placeholder="(11) 98765-4321"
            placeholderTextColor={COLORS.faint}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <Text style={styles.ajuda}>
            Guardado só neste aparelho. Quem já tem seu número consegue te encontrar;
            ninguém consegue ler telefones.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.rotulo}>NO COMBOIO ({voice.participants.length})</Text>
        {voice.participants.length === 0 ? (
          <Text style={styles.ajuda}>Ninguém conectado ainda.</Text>
        ) : (
          voice.participants.map((p: VoiceParticipant) => (
            <View key={p.id} style={styles.linhaParticipante}>
              <View
                style={[styles.avatar, p.isSpeaking && { backgroundColor: COLORS.accent }]}
              >
                <Text
                  style={[
                    styles.avatarTexto,
                    p.isSpeaking && { color: COLORS.background },
                  ]}
                >
                  {p.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomeParticipante}>
                  {p.name}
                  {p.isHost ? ' · líder' : ''}
                </Text>
                <Text style={styles.ajuda}>
                  {p.isMuted ? 'mudo' : p.isSpeaking ? 'falando' : 'ouvindo'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Navegador de comboios e busca por telefone */}
      <Modal visible={painelAberto} transparent animationType="slide">
        <View style={styles.fundoModal}>
          <View style={styles.modal}>
            <View style={styles.cabecalhoModal}>
              <Text style={styles.titulo}>Comboios ativos</Text>
              <Pressable onPress={() => setPainelAberto(false)}>
                <Text style={styles.fechar}>Fechar</Text>
              </Pressable>
            </View>

            <View style={styles.linhaKm}>
              <TextInput
                value={buscaTelefone}
                onChangeText={setBuscaTelefone}
                placeholder="Achar piloto pelo telefone"
                placeholderTextColor={COLORS.faint}
                keyboardType="phone-pad"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable
                onPress={() =>
                  void browser.refresh({
                    phone: normalizePhone(buscaTelefone),
                    idToken,
                  })
                }
                style={styles.botaoPequeno}
              >
                <Text style={styles.botaoPequenoTexto}>Buscar</Text>
              </Pressable>
            </View>

            {browser.searched && !browser.found && (
              <Text style={styles.ajuda}>
                Ninguém com esse telefone está em comboio agora.
              </Text>
            )}

            {browser.found && (
              <Pressable
                onPress={() => void entrar(browser.found!.code)}
                style={styles.achado}
              >
                <Text style={styles.achadoTexto}>
                  Está no comboio {browser.found.code} — tocar para entrar
                </Text>
              </Pressable>
            )}

            <ScrollView style={{ maxHeight: 320 }}>
              {browser.isLoading && <ActivityIndicator color={COLORS.accent} />}
              {!browser.isLoading && browser.convoys.length === 0 && (
                <Text style={styles.ajuda}>Nenhum comboio ativo no momento.</Text>
              )}
              {browser.convoys.map((c) => (
                <View key={c.code} style={styles.linhaComboio}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.codigoComboio}>{c.code}</Text>
                    <Text style={styles.ajuda}>
                      {c.riders} de {CONVOY_CAPACITY}
                      {c.total > c.riders ? ` · ${c.total - c.riders} de apoio` : ''}
                      {c.isFull ? ' · lotado' : ''}
                    </Text>
                  </View>
                  {c.code === roomCode ? (
                    <Text style={styles.aqui}>você está aqui</Text>
                  ) : (
                    <Pressable
                      onPress={() => void entrar(c.code)}
                      style={styles.botaoPequeno}
                    >
                      <Text style={styles.botaoPequenoTexto}>Entrar</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 12, paddingBottom: 28 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  linhaStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  status: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  servidor: { color: COLORS.faint, fontSize: 10, marginTop: -6 },
  erro: { color: COLORS.danger, fontSize: 11 },
  rotulo: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  codigo: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: -4,
  },
  linhaBotoes: { flexDirection: 'row', gap: 8 },
  linhaKm: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  botaoPrincipal: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botaoSair: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  botaoPrincipalTexto: { color: COLORS.background, fontWeight: '800', fontSize: 15 },
  botaoMic: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  botaoMicMudo: { backgroundColor: COLORS.surfaceAlt },
  botaoMicTexto: { color: COLORS.background, fontWeight: '800', fontSize: 13 },
  botaoSecundario: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  botaoSecundarioTexto: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  botaoPequeno: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botaoPequenoTexto: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  rotuloCampo: { color: COLORS.muted, fontSize: 11 },
  ajuda: { color: COLORS.faint, fontSize: 11, lineHeight: 16 },
  linhaParticipante: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: COLORS.text, fontWeight: '800' },
  nomeParticipante: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  fundoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 20,
    gap: 10,
  },
  cabecalhoModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  fechar: { color: COLORS.muted, fontSize: 12 },
  achado: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: 12,
    padding: 12,
  },
  achadoTexto: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
  linhaComboio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  codigoComboio: { color: COLORS.text, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  aqui: { color: COLORS.accent, fontSize: 10, fontWeight: '700' },
});
