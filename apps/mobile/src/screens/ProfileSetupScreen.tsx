import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createLocalProfile,
  validateProfile,
  type ProfileInput,
  type RiderProfile,
} from '@motorede/shared';
import { COLORS } from '../theme';

/**
 * Cadastro de entrada.
 *
 * Sem senha, de propósito. Senha guardada no aparelho não autentica nada —
 * qualquer um edita o armazenamento local e vira quem quiser, e o servidor não
 * teria como verificá-la. Seria custo de construção e ilusão de segurança ao
 * mesmo tempo.
 *
 * Isto é um **perfil**: serve para os outros pilotos te reconhecerem no
 * comboio. Autenticação de verdade é o caminho do Google, oferecido ao lado,
 * porque lá o servidor confere a assinatura.
 */

interface ProfileSetupScreenProps {
  onSalvar: (perfil: RiderProfile) => void;
  onEntrarComGoogle?: () => void;
  googleDisponivel: boolean;
  erroGoogle: string | null;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  onSalvar,
  onEntrarComGoogle,
  googleDisponivel,
  erroGoogle,
}) => {
  const insets = useSafeAreaInsets();
  const [dados, setDados] = useState<ProfileInput>({ name: '', email: '', phone: '' });
  const [erros, setErros] = useState<ReturnType<typeof validateProfile>['errors']>({});

  const salvar = () => {
    const resultado = validateProfile(dados);
    if (!resultado.valid) {
      setErros(resultado.errors);
      return;
    }
    onSalvar(createLocalProfile(dados));
  };

  const campo = (
    chave: keyof ProfileInput,
    rotulo: string,
    placeholder: string,
    opcional = false,
    teclado: 'default' | 'email-address' | 'phone-pad' = 'default'
  ) => (
    <View style={{ gap: 6 }}>
      <Text style={styles.rotulo}>
        {rotulo}
        {opcional && <Text style={styles.opcional}> (opcional)</Text>}
      </Text>
      <TextInput
        value={dados[chave]}
        onChangeText={(t) => {
          setDados((d) => ({ ...d, [chave]: t }));
          setErros((e) => ({ ...e, [chave]: undefined }));
        }}
        placeholder={placeholder}
        placeholderTextColor={COLORS.faint}
        keyboardType={teclado}
        autoCapitalize={chave === 'name' ? 'words' : 'none'}
        autoCorrect={false}
        style={[styles.input, erros[chave] && styles.inputErro]}
      />
      {erros[chave] && <Text style={styles.erro}>{erros[chave]}</Text>}
    </View>
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.conteudo,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <Text style={styles.titulo}>MotoRede</Text>
          <Text style={styles.subtitulo}>Como você aparece no comboio</Text>

          <View style={styles.card}>
            {campo('name', 'Nome', 'Como te chamam na estrada')}
            {campo('phone', 'Telefone', '(11) 98765-4321', true, 'phone-pad')}
            <Text style={styles.ajuda}>
              O telefone fica só neste aparelho. Serve para um amigo que já tem seu
              número te encontrar entre os comboios de um evento.
            </Text>

            {campo('email', 'E-mail', 'voce@exemplo.com', true, 'email-address')}

            <Pressable onPress={salvar} style={styles.botaoPrincipal}>
              <Text style={styles.botaoPrincipalTexto}>Começar</Text>
            </Pressable>
          </View>

          {googleDisponivel && (
            <View style={styles.card}>
              <Text style={styles.rotulo}>Ou entre com o Google</Text>
              <Text style={styles.ajuda}>
                Com o Google sua identidade é verificada pelo servidor — necessário
                para organizar eventos e comboios.
              </Text>
              <Pressable onPress={onEntrarComGoogle} style={styles.botaoSecundario}>
                <Text style={styles.botaoSecundarioTexto}>Continuar com Google</Text>
              </Pressable>
              {erroGoogle && <Text style={styles.erro}>{erroGoogle}</Text>}
            </View>
          )}

          <Text style={styles.rodape}>
            Seus dados ficam neste aparelho. Nada é enviado para servidor nenhum
            enquanto você não entrar num comboio.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  conteudo: { padding: 20, gap: 14, justifyContent: 'center', flexGrow: 1 },
  titulo: { color: COLORS.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitulo: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 12,
  },
  rotulo: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  opcional: { color: COLORS.faint, fontWeight: '400' },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  inputErro: { borderColor: COLORS.danger },
  erro: { color: COLORS.danger, fontSize: 11 },
  ajuda: { color: COLORS.faint, fontSize: 11, lineHeight: 16, marginTop: -4 },
  botaoPrincipal: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoPrincipalTexto: { color: COLORS.background, fontWeight: '800', fontSize: 15 },
  botaoSecundario: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  botaoSecundarioTexto: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  rodape: {
    color: COLORS.faint,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 10,
  },
});
