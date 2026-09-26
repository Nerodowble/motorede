import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PLUGIN_VOLUME_STEP } from '@motorede/shared';
import type { PluginAudio } from '../hooks/usePluginAudio';
import { PluginSheet } from './PluginSheet';
import { COLORS } from '../theme';

/**
 * Card do plugin de áudio na tela do comboio.
 *
 * É a parte usada em movimento, então tem no máximo três alvos, todos grandes
 * e com texto. Escolher lista e buscar ficam na folha, pensada para quando
 * a moto está parada.
 *
 * Cores neutras de propósito: âmbar já quer dizer "alguém falando" e verde
 * "microfone aberto". O áudio do plugin é subordinado à voz.
 */

interface PluginCardProps {
  pluginAudio: PluginAudio;
  souLider: boolean;
}

const ACOES: Record<string, string> = {
  tocar: 'trocou a lista',
  pausar: 'pausou',
  continuar: 'continuou',
  pular: 'pulou para o próximo',
  parar: 'parou',
  embaralhar: 'mexeu no embaralhar',
};

/** Frase curta do último comando, só nos 8 s seguintes a ele. */
function ultimaAcao(pluginAudio: PluginAudio, agora: number): string | null {
  const u = pluginAudio.estado?.ultimo;
  if (!u || agora - u.em > 8_000) return null;
  return `${u.por} ${ACOES[u.acao] ?? u.acao}`;
}

export const PluginCard: React.FC<PluginCardProps> = ({ pluginAudio, souLider }) => {
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [pularTravado, setPularTravado] = useState(false);
  const [agora, setAgora] = useState(Date.now());

  // Relógio só para expirar a frase "Fulano pulou para o próximo".
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 2_000);
    return () => clearInterval(t);
  }, []);

  if (pluginAudio.fase === 'indisponivel' || !pluginAudio.plugin) return <ConectarPlugin pluginAudio={pluginAudio} />;
  const nome = pluginAudio.plugin.nome;

  const pular = () => {
    if (pularTravado) return;
    setPularTravado(true);
    setTimeout(() => setPularTravado(false), 2_000);
    void pluginAudio.enviar({ tipo: 'pular' });
  };

  let corpo: React.ReactNode;

  if (pluginAudio.fase === 'fora') {
    corpo = (
      <>
        <Text style={styles.linha1}>{nome}</Text>
        {!pluginAudio.plugin.online && (
          <Text style={styles.linha2}>O computador parece desligado agora.</Text>
        )}
        {pluginAudio.aviso && <Text style={styles.linha2}>{pluginAudio.aviso}</Text>}
        <Pressable onPress={() => void pluginAudio.chamar()} style={styles.botaoLargo}>
          <Text style={styles.botaoTexto}>Chamar plugin</Text>
        </Pressable>
      </>
    );
  } else if (pluginAudio.fase === 'chamando') {
    corpo = (
      <>
        <View style={styles.linhaStatus}>
          <ActivityIndicator size="small" color={COLORS.muted} />
          <Text style={styles.linha1}>Chamando… {nome}</Text>
        </View>
        <Text style={styles.linha2}>Costuma responder em até 10 s.</Text>
        <Pressable onPress={pluginAudio.cancelar} style={styles.botaoPequeno}>
          <Text style={styles.botaoTexto}>Cancelar</Text>
        </Pressable>
      </>
    );
  } else if (pluginAudio.fase === 'sem-resposta') {
    corpo = (
      <>
        <Text style={styles.linha1}>{nome} não respondeu.</Text>
        <Text style={styles.linha2}>O computador precisa estar ligado com o plugin aberto.</Text>
        <Pressable onPress={() => void pluginAudio.chamar()} style={styles.botaoLargo}>
          <Text style={styles.botaoTexto}>Tentar de novo</Text>
        </Pressable>
      </>
    );
  } else {
    const e = pluginAudio.estado;
    const tocando = e?.estado === 'tocando';
    const parado = !e || e.estado === 'parado';
    const secundaria =
      (pluginAudio.naoConfirmou && 'O computador não confirmou.') ||
      ultimaAcao(pluginAudio, agora) ||
      (pluginAudio.silenciadoPorMim && 'Silenciado só para você') ||
      e?.lista ||
      null;

    corpo = parado ? (
      <>
        <Text style={styles.linha1}>Nada tocando</Text>
        {secundaria && <Text style={styles.linha2}>{secundaria}</Text>}
        <Pressable onPress={() => setFolhaAberta(true)} style={styles.botaoLargo}>
          <Text style={styles.botaoTexto}>Escolher lista</Text>
        </Pressable>
      </>
    ) : (
      <>
        <Text style={styles.item} numberOfLines={1}>
          {e?.item ?? '—'}
        </Text>
        {secundaria && (
          <Text style={styles.linha2} numberOfLines={1}>
            {secundaria}
          </Text>
        )}
        <View style={styles.linhaBotoes}>
          <Pressable
            onPress={() => void pluginAudio.enviar({ tipo: tocando ? 'pausar' : 'continuar' })}
            disabled={pluginAudio.pendente}
            style={styles.botaoGrande}
          >
            <Text style={styles.botaoTexto}>
              {pluginAudio.pendente ? '…' : tocando ? '❚❚  Pausar' : '▶  Continuar'}
            </Text>
          </Pressable>
          <Pressable onPress={pular} disabled={pularTravado} style={styles.botaoGrande}>
            <Text style={styles.botaoTexto}>⏭  Pular</Text>
          </Pressable>
        </View>
        <Volume pluginAudio={pluginAudio} />
      </>
    );
  }

  const titulo =
    pluginAudio.fase === 'na-sala' && pluginAudio.estado?.estado === 'tocando'
      ? 'PLUGIN · tocando'
      : pluginAudio.fase === 'na-sala' && pluginAudio.estado?.estado === 'pausado'
        ? 'PLUGIN · pausado'
        : 'PLUGIN';

  return (
    <View style={styles.card}>
      <View style={styles.cabecalho}>
        <Text style={styles.rotulo}>{titulo}</Text>
        {pluginAudio.fase === 'na-sala' && (
          <Pressable onPress={() => setFolhaAberta(true)} hitSlop={14}>
            <Text style={styles.abrir}>Abrir ›</Text>
          </Pressable>
        )}
      </View>
      {corpo}
      <PluginSheet
        visivel={folhaAberta}
        aoFechar={() => setFolhaAberta(false)}
        pluginAudio={pluginAudio}
        podeDispensar={souLider || pluginAudio.estado?.chamadoPor === pluginAudio.identidadeLocal}
      />
    </View>
  );
};

/**
 * Volume do plugin neste aparelho, como o de um participante: − e + de 10 em
 * 10%, e silenciar. Vale só para quem mexeu. Botões em vez de controle
 * deslizante: acertam de luva, e não exigem módulo nativo novo no app.
 */
const Volume: React.FC<{ pluginAudio: PluginAudio }> = ({ pluginAudio }) => {
  const { volume, setVolume, silenciadoPorMim, setSilenciadoPorMim } = pluginAudio;
  return (
    <View style={styles.linhaBotoes}>
      <Pressable
        onPress={() => setVolume(volume - PLUGIN_VOLUME_STEP)}
        disabled={silenciadoPorMim || volume <= 0}
        style={styles.botaoVolume}
        accessibilityLabel="Diminuir volume do plugin"
      >
        <Text style={styles.botaoTexto}>−</Text>
      </Pressable>
      <Pressable
        onPress={() => setSilenciadoPorMim(!silenciadoPorMim)}
        style={[styles.botaoGrande, silenciadoPorMim && styles.botaoAceso]}
      >
        <Text style={styles.botaoTexto}>
          {silenciadoPorMim ? 'Silenciado · ouvir' : `Volume ${volume}%`}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setVolume(volume + PLUGIN_VOLUME_STEP)}
        disabled={silenciadoPorMim || volume >= 100}
        style={styles.botaoVolume}
        accessibilityLabel="Aumentar volume do plugin"
      >
        <Text style={styles.botaoTexto}>+</Text>
      </Pressable>
    </View>
  );
};

/**
 * Sem plugin no comboio: só uma linha discreta. Quem tem o código (mostrado
 * no painel do computador onde o plugin roda) digita aqui uma vez; o resto do
 * comboio passa a ver o plugin sem fazer nada.
 */
const ConectarPlugin: React.FC<{ pluginAudio: PluginAudio }> = ({ pluginAudio }) => {
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <Pressable onPress={() => setAberto(true)} style={styles.linhaConectar} hitSlop={6}>
        <Text style={styles.linha2}>Conectar plugin com código</Text>
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

  return (
    <View style={styles.card}>
      <Text style={styles.rotulo}>CONECTAR PLUGIN</Text>
      <Text style={styles.linha2}>
        Digite o código que aparece no painel do plugin. Vale para todo mundo neste comboio.
      </Text>
      <TextInput
        value={codigo}
        onChangeText={(t) => {
          setCodigo(t);
          setErro(null);
        }}
        placeholder="ABC-1234"
        placeholderTextColor={COLORS.faint}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={9}
        style={styles.input}
      />
      {erro && <Text style={styles.erro}>{erro}</Text>}
      <View style={styles.linhaBotoes}>
        <Pressable onPress={() => setAberto(false)} style={styles.botaoGrande}>
          <Text style={styles.botaoTexto}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() => void conectar()}
          disabled={enviando || codigo.replace(/[^a-z0-9]/gi, '').length < 7}
          style={styles.botaoGrande}
        >
          <Text style={styles.botaoTexto}>{enviando ? '…' : 'Conectar'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  linhaConectar: { paddingVertical: 6, alignItems: 'center' },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
  },
  erro: { color: COLORS.danger, fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rotulo: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  abrir: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  linhaStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linha1: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  linha2: { color: COLORS.muted, fontSize: 12 },
  item: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  linhaBotoes: { flexDirection: 'row', gap: 12 },
  botaoGrande: {
    flex: 1,
    minHeight: 64,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoLargo: {
    minHeight: 56,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoVolume: {
    width: 64,
    minHeight: 56,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoAceso: { borderWidth: 1, borderColor: COLORS.muted },
  botaoPequeno: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 18,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    justifyContent: 'center',
  },
  botaoTexto: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
});
