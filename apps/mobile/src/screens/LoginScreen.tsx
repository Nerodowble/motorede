import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../theme';

/**
 * Porta de entrada do app.
 *
 * Espelha a tela de login da web: identidade real antes de entrar, para os
 * outros pilotos reconhecerem quem fala no comboio.
 */

interface LoginScreenProps {
  onSignIn: () => void;
  error: string | null;
  isLoading: boolean;
}

const DESTAQUES = [
  'Comboio por voz, com o celular no bolso',
  'Encontre um amigo pelo telefone no evento',
  'Acompanhe as trocas da sua moto',
];

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSignIn,
  error,
  isLoading,
}) => (
  <SafeAreaView style={styles.screen}>
    <View style={styles.content}>
      <Text style={styles.title}>MotoRede</Text>
      <Text style={styles.subtitle}>A rede de quem anda sobre duas rodas</Text>

      <View style={styles.card}>
        {DESTAQUES.map((texto) => (
          <View key={texto} style={styles.item}>
            <View style={styles.marcador} />
            <Text style={styles.itemTexto}>{texto}</Text>
          </View>
        ))}

        <View style={styles.separador} />

        <Text style={styles.explicacao}>
          Entre para os outros pilotos te reconhecerem no comboio.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 8 }} />
        ) : (
          <Pressable
            onPress={onSignIn}
            style={({ pressed }) => [styles.botao, pressed && styles.pressionado]}
          >
            <Text style={styles.botaoTexto}>Continuar com Google</Text>
          </Pressable>
        )}

        {error && <Text style={styles.erro}>{error}</Text>}
      </View>

      <Text style={styles.rodape}>
        Usamos sua conta apenas para identificar você no comboio.{'\n'}
        Não publicamos nada e não acessamos seus contatos.
      </Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { color: COLORS.text, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 12,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  marcador: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  itemTexto: { color: COLORS.muted, fontSize: 12, flex: 1 },
  separador: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  explicacao: { color: COLORS.muted, fontSize: 11, textAlign: 'center' },
  botao: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pressionado: { opacity: 0.7 },
  botaoTexto: { color: COLORS.background, fontSize: 14, fontWeight: '800' },
  erro: { color: COLORS.danger, fontSize: 11, textAlign: 'center' },
  rodape: {
    color: COLORS.faint,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 15,
  },
});
