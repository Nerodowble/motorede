import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { generateRoomCode, isJoinableRoomCode } from '@motorede/shared';
import { useVoiceConnection } from '../hooks/useVoiceConnection';
import { useConvoyBrowser } from '../hooks/useConvoyBrowser';
import { usePluginAudio } from '../hooks/usePluginAudio';
import { PluginCard } from '../components/PluginCard';
import { PainelComboios } from '../components/comboio/PainelComboios';
import {
  BotaoMicrofone,
  CartaoAoVivo,
  CartaoParticipantes,
  LinhaStatus,
} from '../components/comboio/AoVivo';
import { Botao } from '../components/ui/Botao';
import { Ajuda, Campo, Cartao, Rotulo, estilosBase } from '../components/ui/Cartao';
import { storage } from '../services/storage';
import { TOKEN_ENDPOINT, WEB_APP_URL } from '../config';
import { COLORS, ESPACO, FONTE_CONDENSADA } from '../theme';

/**
 * Comboio por voz — a tela principal do app.
 *
 * É a única que o piloto usa em movimento, então tudo que não serve para isso
 * fica escondido: trocar de comboio some durante a conversa, e o navegador de
 * comboios é um painel à parte.
 *
 * Conectado, a ordem segue o que se procura de relance: está ao vivo e quem
 * fala; o microfone (o maior alvo); quem está junto; o plugin; e só no fim,
 * com confirmação, sair.
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
  const pluginAudio = usePluginAudio(voice.room, voice.sessionToken);
  const souLider = voice.participants.some(
    (p) => p.isHost && p.id === voice.room?.localParticipant.identity
  );

  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const [telefone, setTelefone] = useState('');
  const [painelAberto, setPainelAberto] = useState(false);

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

  // Sair derruba a conversa de todo mundo com você: um toque sem querer, de
  // luva, não pode fazer isso sozinho.
  const confirmarSaida = () =>
    Alert.alert('Sair do comboio?', 'Você para de ouvir e de falar com o grupo.', [
      { text: 'Ficar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void voice.disconnect() },
    ]);

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

  const painel = (
    <PainelComboios
      visivel={painelAberto}
      aoFechar={() => setPainelAberto(false)}
      browser={browser}
      idToken={idToken}
      codigoAtual={roomCode}
      aoEntrar={(c) => void entrar(c)}
    />
  );

  if (isLive) {
    return (
      <ScrollView contentContainerStyle={estilosBase.conteudo}>
        <CartaoAoVivo
          status={voice.status}
          codigo={roomCode}
          participantes={voice.participants}
          erro={voice.error}
          aoConvidar={convidar}
        />
        <BotaoMicrofone
          mudo={voice.isMuted}
          aoAlternar={() => void voice.setMuted(!voice.isMuted)}
        />
        <CartaoParticipantes participantes={voice.participants} />
        <PluginCard pluginAudio={pluginAudio} souLider={souLider} />
        <View style={estilosBase.linhaBotoes}>
          <Botao
            rotulo="Comboios"
            icone="list"
            flex
            onPress={() => setPainelAberto(true)}
          />
          <Botao rotulo="Sair do comboio" icone="exit-outline" variante="perigo" flex onPress={confirmarSaida} />
        </View>
        {painel}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilosBase.conteudo} keyboardShouldPersistTaps="handled">
      <Cartao style={styles.cartaoComboio}>
        <View style={styles.linhaTopo}>
          <Rotulo icone="radio-outline">Seu comboio</Rotulo>
        </View>
        <Text style={styles.codigo} adjustsFontSizeToFit numberOfLines={1}>
          {roomCode}
        </Text>
        {voice.status !== 'disconnected' && <LinhaStatus status={voice.status} />}
        {voice.error && <Text style={estilosBase.erro}>{voice.error}</Text>}

        <Botao
          rotulo="Entrar no comboio"
          icone="headset"
          variante="action"
          altura={64}
          carregando={voice.status === 'connecting'}
          onPress={() => void entrar(roomCode)}
        />
        <View style={estilosBase.linhaBotoes}>
          <Botao rotulo="Convidar" icone="share-social-outline" flex onPress={convidar} />
          <Botao rotulo="Comboios" icone="list" flex onPress={() => setPainelAberto(true)} />
        </View>
      </Cartao>

      {/* Trocar de comboio só aparece fora da conversa: não se oferece isso a
          alguém pilotando. */}
      <Cartao>
        <Rotulo icone="swap-horizontal">Trocar de comboio</Rotulo>
        <View style={styles.linha}>
          <Campo
            value={codigoDigitado}
            onChangeText={(t) => {
              setCodigoDigitado(t);
              setErroCodigo(null);
            }}
            placeholder="Código (ex: K7M-3PQ)"
            autoCapitalize="characters"
            autoCorrect={false}
            erro={!!erroCodigo}
            style={styles.campoCodigo}
          />
          <Botao rotulo="Ir" compacto altura={52} onPress={entrarPorCodigo} />
        </View>
        {erroCodigo && <Text style={estilosBase.erro}>{erroCodigo}</Text>}
        <Botao
          rotulo="Criar comboio novo"
          icone="add"
          onPress={() => onChangeRoom(generateRoomCode())}
        />

        <View style={estilosBase.divisoria} />

        <Rotulo icone="call-outline">Seu telefone</Rotulo>
        <Campo
          value={telefone}
          onChangeText={(t) => {
            setTelefone(t);
            void storage.savePhone(t);
          }}
          placeholder="(11) 98765-4321"
          keyboardType="phone-pad"
        />
        <Ajuda>
          Para amigos te acharem. Guardado só neste aparelho: quem já tem seu número
          consegue te encontrar; ninguém consegue ler telefones.
        </Ajuda>
      </Cartao>
      {painel}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  cartaoComboio: { gap: ESPACO.lg, paddingVertical: ESPACO.xl },
  linhaTopo: { flexDirection: 'row', alignItems: 'center' },
  // O código é dito em voz alta e copiado de outra tela: grande, condensado,
  // em branco (âmbar agora é só "falando").
  codigo: {
    color: COLORS.ink,
    fontSize: 52,
    fontWeight: '800',
    fontFamily: FONTE_CONDENSADA,
    letterSpacing: 4,
    marginVertical: -ESPACO.xs,
  },
  linha: { flexDirection: 'row', gap: ESPACO.sm, alignItems: 'center' },
  campoCodigo: { flex: 1, letterSpacing: 1.5, fontWeight: '700' },
});
