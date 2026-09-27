import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PLUGIN_VOLUME_STEP } from '@motorede/shared';
import type { PluginAudio } from '../hooks/usePluginAudio';
import { ALVO, COLORS, ESPACO, RAIO } from '../theme';
import { Botao } from './ui/Botao';
import { Ajuda, Campo, Cartao, Rotulo, estilosBase } from './ui/Cartao';

/** Partes do card do plugin: volume, seletor, rodapé e o "conectar". */

/**
 * Volume do plugin neste aparelho, como o de um participante: − e + de 10 em
 * 10%, e silenciar. Vale só para quem mexeu. Botões em vez de controle
 * deslizante: acertam de luva, e não exigem módulo nativo novo no app.
 */
export const Volume: React.FC<{ pluginAudio: PluginAudio }> = ({ pluginAudio }) => {
  const { volume, setVolume, silenciadoPorMim, setSilenciadoPorMim } = pluginAudio;
  return (
    <View style={estilosBase.linhaBotoes}>
      <BotaoQuadrado
        icone="remove"
        rotulo="Diminuir volume do plugin"
        disabled={silenciadoPorMim || volume <= 0}
        onPress={() => setVolume(volume - PLUGIN_VOLUME_STEP)}
      />
      <Pressable
        onPress={() => setSilenciadoPorMim(!silenciadoPorMim)}
        accessibilityRole="button"
        accessibilityLabel={silenciadoPorMim ? 'Plugin silenciado. Tocar para ouvir' : 'Silenciar plugin só para mim'}
        style={({ pressed }) => [
          styles.volume,
          silenciadoPorMim && styles.volumeSilenciado,
          pressed && styles.pressionado,
        ]}
      >
        <Ionicons
          name={silenciadoPorMim ? 'volume-mute' : 'volume-medium'}
          size={22}
          color={COLORS.ink}
        />
        <Text style={styles.volumeTexto}>
          {silenciadoPorMim ? 'Silenciado · ouvir' : `${volume}%`}
        </Text>
      </Pressable>
      <BotaoQuadrado
        icone="add"
        rotulo="Aumentar volume do plugin"
        disabled={silenciadoPorMim || volume >= 100}
        onPress={() => setVolume(volume + PLUGIN_VOLUME_STEP)}
      />
    </View>
  );
};

const BotaoQuadrado: React.FC<{
  icone: React.ComponentProps<typeof Ionicons>['name'];
  rotulo: string;
  disabled: boolean;
  onPress: () => void;
}> = ({ icone, rotulo, disabled, onPress }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={rotulo}
    style={({ pressed }) => [
      styles.quadrado,
      disabled && styles.inativo,
      pressed && styles.pressionado,
    ]}
  >
    <Ionicons name={icone} size={26} color={COLORS.ink} />
  </Pressable>
);

/** Mais de um plugin no comboio: escolhe qual o card controla. */
export const Seletor: React.FC<{ pluginAudio: PluginAudio }> = ({ pluginAudio }) => (
  <View style={styles.seletor}>
    {pluginAudio.plugins.map((p) => {
      const ativo = p.id === pluginAudio.plugin?.id;
      return (
        <Pressable
          key={p.id}
          onPress={() => pluginAudio.selecionar(p.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: ativo }}
          style={[styles.chip, ativo && styles.chipAtivo]}
          hitSlop={4}
        >
          <Ionicons
            name={p.online ? 'desktop-outline' : 'moon-outline'}
            size={16}
            color={ativo ? COLORS.onAction : COLORS.inkMuted}
          />
          <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]} numberOfLines={1}>
            {p.nome}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/**
 * Sempre visível com um plugin pareado — dentro ou fora da sala, computador
 * ligado ou não: conectar outro, ou desvincular este. Qualquer um do comboio
 * pode, do mesmo jeito que qualquer um pode conectar.
 */
export const Rodape: React.FC<{ pluginAudio: PluginAudio }> = ({ pluginAudio }) => {
  const [conectando, setConectando] = useState(false);
  const nome = pluginAudio.plugin?.nome ?? 'o plugin';

  if (conectando) {
    return (
      <ConectarPlugin pluginAudio={pluginAudio} aberto aoFechar={() => setConectando(false)} embutido />
    );
  }

  const desvincular = () =>
    Alert.alert(
      'Desvincular?',
      `${nome} some deste comboio para todo mundo. Para voltar, alguém digita o código de novo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desvincular', style: 'destructive', onPress: () => void pluginAudio.desparear() },
      ]
    );

  return (
    <View style={styles.rodape}>
      <LinkRodape icone="add-circle-outline" rotulo="Conectar outro" onPress={() => setConectando(true)} />
      <LinkRodape icone="unlink-outline" rotulo="Desvincular" cor={COLORS.dangerText} onPress={desvincular} />
    </View>
  );
};

const LinkRodape: React.FC<{
  icone: React.ComponentProps<typeof Ionicons>['name'];
  rotulo: string;
  onPress: () => void;
  cor?: string;
}> = ({ icone, rotulo, onPress, cor = COLORS.inkMuted }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    style={({ pressed }) => [styles.link, pressed && styles.pressionado]}
  >
    <Ionicons name={icone} size={18} color={cor} />
    <Text style={[styles.linkTexto, { color: cor }]}>{rotulo}</Text>
  </Pressable>
);

/**
 * Sem plugin no comboio: só uma linha discreta. Quem tem o código (mostrado
 * no painel do computador onde o plugin roda) digita aqui uma vez; o resto do
 * comboio passa a ver o plugin sem fazer nada.
 */
export const ConectarPlugin: React.FC<{
  pluginAudio: PluginAudio;
  /** Já começa com o campo aberto (quando vem do "Conectar outro"). */
  aberto?: boolean;
  aoFechar?: () => void;
  /** Dentro de outro card: sem moldura própria. */
  embutido?: boolean;
}> = ({ pluginAudio, aberto: abertoInicial = false, aoFechar, embutido = false }) => {
  const [aberto, setAbertoInterno] = useState(abertoInicial);
  const setAberto = (v: boolean) => {
    setAbertoInterno(v);
    if (!v) aoFechar?.();
  };
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <Pressable
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.linhaConectar, pressed && styles.pressionado]}
      >
        <Ionicons name="musical-notes-outline" size={20} color={COLORS.inkMuted} />
        <Text style={styles.linkTexto}>Conectar plugin com código</Text>
      </Pressable>
    );
  }

  const conectar = async () => {
    setEnviando(true);
    setErro(null);
    const falha = await pluginAudio.parear(codigo);
    setEnviando(false);
    if (falha) setErro(falha);
    else {
      setAberto(false);
      setCodigo('');
    }
  };

  const conteudo = (
    <>
      <Rotulo icone="musical-notes-outline">Conectar plugin</Rotulo>
      <Ajuda>
        Digite o código que aparece no painel do plugin. Vale para todo mundo neste comboio.
      </Ajuda>
      <Campo
        value={codigo}
        onChangeText={(t) => {
          setCodigo(t);
          setErro(null);
        }}
        placeholder="ABC-1234"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={9}
        erro={!!erro}
        style={styles.campoCodigo}
      />
      {erro && <Text style={estilosBase.erro}>{erro}</Text>}
      <View style={estilosBase.linhaBotoes}>
        <Botao rotulo="Cancelar" flex altura={ALVO.botao} onPress={() => setAberto(false)} />
        <Botao
          rotulo="Conectar"
          variante="action"
          flex
          carregando={enviando}
          disabled={codigo.replace(/[^a-z0-9]/gi, '').length < 7}
          onPress={() => void conectar()}
        />
      </View>
    </>
  );

  return embutido ? <View style={styles.embutido}>{conteudo}</View> : <Cartao>{conteudo}</Cartao>;
};

const styles = StyleSheet.create({
  pressionado: { opacity: 0.75 },
  inativo: { opacity: 0.4 },
  quadrado: {
    width: ALVO.grande,
    minHeight: ALVO.botao,
    borderRadius: RAIO.md,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volume: {
    flex: 1,
    minHeight: ALVO.botao,
    borderRadius: RAIO.md,
    backgroundColor: COLORS.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACO.sm,
  },
  volumeSilenciado: { borderWidth: 1, borderColor: COLORS.lineStrong },
  volumeTexto: { color: COLORS.ink, fontWeight: '800', fontSize: 15 },
  seletor: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  chip: {
    minHeight: ALVO.min,
    paddingHorizontal: ESPACO.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    borderRadius: RAIO.pill,
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    backgroundColor: COLORS.elevated,
    maxWidth: '100%',
  },
  chipAtivo: { backgroundColor: COLORS.action, borderColor: COLORS.action },
  chipTexto: { color: COLORS.inkMuted, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  chipTextoAtivo: { color: COLORS.onAction },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: ESPACO.xs,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.xs + 2,
    minHeight: ALVO.min,
    paddingHorizontal: ESPACO.xs,
  },
  linkTexto: { color: COLORS.inkMuted, fontSize: 14, fontWeight: '700' },
  linhaConectar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACO.sm,
    minHeight: ALVO.botao,
    borderRadius: RAIO.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.lineStrong,
  },
  embutido: {
    gap: ESPACO.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: ESPACO.md,
  },
  campoCodigo: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
});
