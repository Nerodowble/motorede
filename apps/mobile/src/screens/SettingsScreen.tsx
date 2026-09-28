import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Updates from 'expo-updates';
import type { RiderProfile } from '@motorede/shared';
import { COLORS, ESPACO, TIPO } from '../theme';
import { Botao, type NomeIcone } from '../components/ui/Botao';
import { Ajuda, Cartao, TituloCartao, estilosBase } from '../components/ui/Cartao';
import { storage, type ModoAudio } from '../services/storage';

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
  const [modoAudio, setModoAudio] = useState<ModoAudio>('conversa');

  useEffect(() => {
    void storage.getModoAudio().then(setModoAudio);
  }, []);

  const escolherModo = (modo: ModoAudio) => {
    setModoAudio(modo);
    void storage.saveModoAudio(modo);
  };

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
  const verificado = profile.source === 'google';

  return (
    <ScrollView contentContainerStyle={estilosBase.conteudo}>
      <Cartao>
        <View style={styles.perfil}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={TIPO.tituloCard} numberOfLines={1}>
              {profile.name}
            </Text>
            <View style={styles.identidade}>
              <Ionicons
                name={verificado ? 'shield-checkmark' : 'person-outline'}
                size={14}
                color={COLORS.inkMuted}
              />
              <Text style={TIPO.apoio}>
                {verificado ? 'Verificada pelo Google' : 'Perfil local'}
              </Text>
            </View>
          </View>
        </View>
        {!!profile.email && <Linha icone="mail-outline" rotulo="E-mail" valor={profile.email} />}
        {!!profile.phone && <Linha icone="call-outline" rotulo="Telefone" valor={profile.phone} />}
        {profile.source === 'local' && (
          <Ajuda>
            O perfil local serve para os outros te reconhecerem no comboio. Ele não
            prova quem você é — isso só o Google faz, e será exigido para organizar
            eventos.
          </Ajuda>
        )}
      </Cartao>

      <Cartao>
        <TituloCartao icone="musical-notes-outline">Som do comboio</TituloCartao>
        <View style={styles.opcoesColuna}>
          <Botao
            rotulo="Conversa (padrão)"
            icone="chatbubbles-outline"
            variante={modoAudio === 'conversa' ? 'action' : 'secundario'}
            onPress={() => escolherModo('conversa')}
          />
          <Botao
            rotulo="Teste: conversa + som de mídia"
            icone="flask-outline"
            variante={modoAudio === 'conversa-midia' ? 'action' : 'secundario'}
            onPress={() => escolherModo('conversa-midia')}
          />
          <Botao
            rotulo="Teste: só música"
            icone="headset-outline"
            variante={modoAudio === 'musica' ? 'action' : 'secundario'}
            onPress={() => escolherModo('musica')}
          />
        </View>
        <Ajuda>
          {modoAudio === 'conversa'
            ? 'Padrão. Liga o microfone do fone Bluetooth de capacete. A música do plugin sai com som de ligação.'
            : modoAudio === 'conversa-midia'
              ? 'Teste: continua com o microfone do fone, mas pede ao celular para tratar o som como mídia — em muitos aparelhos a música para de ser "abafada".'
              : 'Teste: som limpo, mas no fone Bluetooth o microfone do fone não funciona.'}
          {' '}Vale na próxima vez que entrar no comboio.
        </Ajuda>
      </Cartao>

      <Cartao>
        <TituloCartao icone="cloud-download-outline">Atualização</TituloCartao>

        <Botao
          rotulo="Procurar atualizações"
          icone="refresh"
          variante="action"
          carregando={ocupado}
          onPress={() => void procurarAtualizacao()}
        />

        {estado.fase === 'procurando' && <Text style={styles.status}>Procurando…</Text>}
        {estado.fase === 'baixando' && (
          <Text style={styles.status}>Baixando a nova versão…</Text>
        )}
        {estado.fase === 'em-dia' && (
          <View style={styles.linhaStatus}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.ink} />
            <Text style={[styles.status, styles.statusBom]}>
              Você já está na versão mais recente.
            </Text>
          </View>
        )}
        {estado.fase === 'erro' && (
          <Text style={[styles.status, styles.statusRuim]}>{estado.mensagem}</Text>
        )}

        <Ajuda>
          Isso troca só o que é JavaScript. Mudança em biblioteca ou em permissão do
          aparelho continua exigindo um APK novo.
        </Ajuda>
      </Cartao>

      <Cartao>
        <TituloCartao icone="information-circle-outline">Versão</TituloCartao>
        <Linha rotulo="App" valor={Updates.runtimeVersion ?? '—'} />
        <Linha rotulo="Canal" valor={Updates.channel ?? 'nenhum (build local)'} />
        <Linha
          rotulo="Pacote em uso"
          valor={Updates.isEmbeddedLaunch ? 'o que veio no APK' : 'baixado depois'}
        />
        <Linha rotulo="Identificador" valor={Updates.updateId ?? '—'} />
        <Ajuda>
          O identificador muda a cada atualização aplicada. Se ele continuar igual
          depois de reiniciar, a atualização não entrou.
        </Ajuda>
      </Cartao>

      {/* Sair mora aqui, e não mais no cabeçalho: apaga o perfil deste
          aparelho, então fica longe do toque acidental. */}
      <Botao rotulo="Sair da conta" icone="log-out-outline" variante="perigo" onPress={onSair} />
    </ScrollView>
  );
};

const Linha: React.FC<{ rotulo: string; valor: string; icone?: NomeIcone }> = ({
  rotulo,
  valor,
  icone,
}) => (
  <View style={styles.linha}>
    {icone && <Ionicons name={icone} size={16} color={COLORS.inkFaint} />}
    <Text style={styles.linhaRotulo}>{rotulo}</Text>
    <Text style={styles.linhaValor} numberOfLines={1} ellipsizeMode="middle">
      {valor}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  opcoes: { flexDirection: 'row', gap: ESPACO.sm },
  opcoesColuna: { gap: ESPACO.sm },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.elevated,
    borderWidth: 2,
    borderColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: COLORS.ink, fontSize: 22, fontWeight: '800' },
  identidade: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.xs },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  linhaRotulo: { color: COLORS.inkMuted, fontSize: 14, width: 110 },
  linhaValor: { color: COLORS.ink, fontSize: 14, flex: 1, textAlign: 'right' },
  linhaStatus: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  status: { fontSize: 14, color: COLORS.inkMuted, lineHeight: 20 },
  statusBom: { color: COLORS.ink, flex: 1 },
  statusRuim: { color: COLORS.dangerText },
});
