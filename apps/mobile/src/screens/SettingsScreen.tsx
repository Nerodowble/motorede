import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';
import type { RiderProfile } from '@motorede/shared';
import { COLORS } from '../theme';

/**
 * Ajustes.
 *
 * POR QUE EXISTE UM BOTÃO DE ATUALIZAR
 *
 * O app já procurava atualizações sozinho, mas de um jeito que ninguém
 * consegue observar: `fallbackToCacheTimeout: 0` manda abrir na hora com a
 * versão em cache e baixar a nova por trás. Quem abre o app não vê mudança
 * nenhuma — o que foi baixado só entra na PRÓXIMA abertura. Sem saber disso,
 * parece que nunca atualiza.
 *
 * Aqui a mesma coisa acontece à vista: procura, diz o que achou, baixa e
 * reinicia na hora. E quando dá errado, mostra o erro em vez de engolir.
 *
 * O que este botão NÃO alcança: mudança de código nativo — uma biblioteca
 * nova, uma permissão nova. Isso exige APK novo, porque o que mudou é o motor
 * que roda o JavaScript. Por isso a versão do runtime aparece nesta tela: é ela
 * que precisa bater entre o APK instalado e a atualização publicada.
 */

interface SettingsScreenProps {
  profile: RiderProfile;
  onSair: () => void;
}

type EstadoBusca =
  | { fase: 'parado' }
  | { fase: 'procurando' }
  | { fase: 'baixando' }
  | { fase: 'em-dia' }
  | { fase: 'erro'; mensagem: string };

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ profile, onSair }) => {
  const [estado, setEstado] = useState<EstadoBusca>({ fase: 'parado' });

  const procurarAtualizacao = useCallback(async () => {
    // Em desenvolvimento o app roda direto do Metro, não de um pacote
    // publicado: não há o que buscar, e a API responde com erro em vez de
    // "em dia". Dizer isso é mais útil que mostrar a falha crua.
    if (__DEV__ || !Updates.isEnabled) {
      setEstado({
        fase: 'erro',
        mensagem:
          'A atualização por download só funciona no APK publicado, não no modo desenvolvimento.',
      });
      return;
    }

    setEstado({ fase: 'procurando' });
    try {
      const resultado = await Updates.checkForUpdateAsync();
      if (!resultado.isAvailable) {
        setEstado({ fase: 'em-dia' });
        return;
      }

      setEstado({ fase: 'baixando' });
      await Updates.fetchUpdateAsync();

      Alert.alert(
        'Atualização pronta',
        'O app precisa reiniciar para aplicar. Se você estiver num comboio, a conversa cai por alguns segundos.',
        [
          { text: 'Agora não', style: 'cancel', onPress: () => setEstado({ fase: 'parado' }) },
          { text: 'Reiniciar', onPress: () => void Updates.reloadAsync() },
        ]
      );
    } catch (erro) {
      // O erro real, não um "tente novamente". Sem ele não dá para distinguir
      // rede caída de canal errado ou runtime incompatível.
      setEstado({
        fase: 'erro',
        mensagem: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }, []);

  const ocupado = estado.fase === 'procurando' || estado.fase === 'baixando';

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <View style={styles.card}>
        <Text style={styles.tituloCard}>Você</Text>
        <Linha rotulo="Nome" valor={profile.name} />
        {!!profile.email && <Linha rotulo="E-mail" valor={profile.email} />}
        {!!profile.phone && <Linha rotulo="Telefone" valor={profile.phone} />}
        <Linha
          rotulo="Identidade"
          valor={profile.source === 'google' ? 'Verificada pelo Google' : 'Perfil local'}
        />
        {profile.source === 'local' && (
          <Text style={styles.ajuda}>
            O perfil local serve para os outros te reconhecerem no comboio. Ele não
            prova quem você é — isso só o Google faz, e será exigido para organizar
            eventos.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.tituloCard}>Atualização</Text>

        <Pressable
          onPress={procurarAtualizacao}
          disabled={ocupado}
          style={[styles.botao, ocupado && styles.botaoOcupado]}
        >
          {ocupado ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.botaoTexto}>Procurar atualizações</Text>
          )}
        </Pressable>

        {estado.fase === 'procurando' && <Text style={styles.status}>Procurando…</Text>}
        {estado.fase === 'baixando' && (
          <Text style={styles.status}>Baixando a nova versão…</Text>
        )}
        {estado.fase === 'em-dia' && (
          <Text style={[styles.status, styles.statusBom]}>
            Você já está na versão mais recente.
          </Text>
        )}
        {estado.fase === 'erro' && (
          <Text style={[styles.status, styles.statusRuim]}>{estado.mensagem}</Text>
        )}

        <Text style={styles.ajuda}>
          Isso troca só o que é JavaScript. Mudança em biblioteca ou em permissão do
          aparelho continua exigindo um APK novo.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.tituloCard}>Versão</Text>
        <Linha rotulo="App" valor={Updates.runtimeVersion ?? '—'} />
        <Linha rotulo="Canal" valor={Updates.channel ?? 'nenhum (build local)'} />
        <Linha
          rotulo="Pacote em uso"
          valor={Updates.isEmbeddedLaunch ? 'o que veio no APK' : 'baixado depois'}
        />
        <Linha rotulo="Identificador" valor={Updates.updateId ?? '—'} />
        <Text style={styles.ajuda}>
          O identificador muda a cada atualização aplicada. Se ele continuar igual
          depois de reiniciar, a atualização não entrou.
        </Text>
      </View>

      <Pressable onPress={onSair} style={styles.botaoSair}>
        <Text style={styles.botaoSairTexto}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
};

const Linha: React.FC<{ rotulo: string; valor: string }> = ({ rotulo, valor }) => (
  <View style={styles.linha}>
    <Text style={styles.linhaRotulo}>{rotulo}</Text>
    <Text style={styles.linhaValor} numberOfLines={1} ellipsizeMode="middle">
      {valor}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 8,
  },
  tituloCard: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linhaRotulo: { color: COLORS.faint, fontSize: 12, width: 104 },
  linhaValor: { color: COLORS.text, fontSize: 12, flex: 1, textAlign: 'right' },
  ajuda: { color: COLORS.faint, fontSize: 11, lineHeight: 16, marginTop: 4 },
  status: { fontSize: 12, marginTop: 8, color: COLORS.muted, lineHeight: 17 },
  statusBom: { color: COLORS.success },
  statusRuim: { color: COLORS.danger },
  botao: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoOcupado: { opacity: 0.7 },
  botaoTexto: { color: COLORS.background, fontSize: 13, fontWeight: '800' },
  botaoSair: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  botaoSairTexto: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
});
