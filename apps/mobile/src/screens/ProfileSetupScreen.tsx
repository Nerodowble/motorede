import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createLocalProfile,
  validateProfile,
  type ProfileInput,
  type RiderProfile,
} from '@motorede/shared';
import { COLORS, ESPACO, TIPO } from '../theme';
import { Botao } from '../components/ui/Botao';
import { Ajuda, Campo, Cartao, estilosBase } from '../components/ui/Cartao';

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
    <View style={{ gap: ESPACO.sm }}>
      <Text style={styles.rotulo}>
        {rotulo}
        {opcional && <Text style={styles.opcional}> (opcional)</Text>}
      </Text>
      <Campo
        value={dados[chave]}
        onChangeText={(t) => {
          setDados((d) => ({ ...d, [chave]: t }));
          setErros((e) => ({ ...e, [chave]: undefined }));
        }}
        placeholder={placeholder}
        keyboardType={teclado}
        autoCapitalize={chave === 'name' ? 'words' : 'none'}
        autoCorrect={false}
        erro={!!erros[chave]}
      />
      {erros[chave] && <Text style={estilosBase.erro}>{erros[chave]}</Text>}
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
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            accessibilityLabel="MotoRede"
          />
          <Text style={styles.titulo}>Como você aparece no comboio</Text>
          <Text style={styles.subtitulo}>
            Voz entre motos, socorro de quem está perto e a manutenção em dia.
          </Text>

          <Cartao style={styles.card}>
            {campo('name', 'Nome', 'Como te chamam na estrada')}
            {campo('phone', 'Telefone', '(11) 98765-4321', true, 'phone-pad')}
            <Ajuda>
              O telefone fica só neste aparelho. Serve para um amigo que já tem seu
              número te encontrar entre os comboios de um evento.
            </Ajuda>

            {campo('email', 'E-mail', 'voce@exemplo.com', true, 'email-address')}

            <Botao
              rotulo="Começar"
              icone="arrow-forward"
              variante="action"
              altura={60}
              onPress={salvar}
            />
          </Cartao>

          {googleDisponivel && (
            <Cartao style={styles.card}>
              <View style={styles.linhaGoogle}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.inkMuted} />
                <Text style={TIPO.rotulo}>Ou entre com o Google</Text>
              </View>
              <Ajuda>
                Com o Google sua identidade é verificada pelo servidor — necessário
                para organizar eventos e comboios.
              </Ajuda>
              <Botao
                rotulo="Continuar com Google"
                icone="logo-google"
                onPress={() => onEntrarComGoogle?.()}
              />
              {erroGoogle && <Text style={estilosBase.erro}>{erroGoogle}</Text>}
            </Cartao>
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
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  conteudo: { padding: ESPACO.xl - 4, gap: ESPACO.lg, justifyContent: 'center', flexGrow: 1 },
  logo: { width: 168, height: 168, alignSelf: 'center' },
  titulo: { ...TIPO.titulo, textAlign: 'center', marginTop: -ESPACO.sm },
  subtitulo: {
    ...TIPO.apoio,
    textAlign: 'center',
    marginBottom: ESPACO.sm,
    paddingHorizontal: ESPACO.lg,
  },
  card: { padding: ESPACO.xl - 4, gap: ESPACO.lg },
  rotulo: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  opcional: { color: COLORS.inkFaint, fontWeight: '400' },
  linhaGoogle: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  rodape: {
    color: COLORS.inkFaint,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: ESPACO.md,
  },
});
