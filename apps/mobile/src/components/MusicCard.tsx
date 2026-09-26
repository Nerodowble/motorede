import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MusicPlugin } from '../hooks/useMusicPlugin';
import { MusicSheet } from './MusicSheet';
import { COLORS } from '../theme';

/**
 * Card de música na tela do comboio.
 *
 * É a parte usada em movimento, então tem no máximo três alvos, todos grandes
 * e com texto. Escolher playlist e buscar ficam na folha, pensada para quando
 * a moto está parada.
 *
 * Cores neutras de propósito: âmbar já quer dizer "alguém falando" e verde
 * "microfone aberto". A música é subordinada à voz.
 */

interface MusicCardProps {
  music: MusicPlugin;
  souLider: boolean;
}

const ACOES: Record<string, string> = {
  tocar: 'trocou de música',
  pausar: 'pausou',
  continuar: 'continuou',
  pular: 'pulou a faixa',
  parar: 'parou a música',
  embaralhar: 'mexeu no embaralhar',
};

/** Frase curta do último comando, só nos 8 s seguintes a ele. */
function ultimaAcao(music: MusicPlugin, agora: number): string | null {
  const u = music.estado?.ultimo;
  if (!u || agora - u.em > 8_000) return null;
  return `${u.por} ${ACOES[u.acao] ?? u.acao}`;
}

export const MusicCard: React.FC<MusicCardProps> = ({ music, souLider }) => {
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [pularTravado, setPularTravado] = useState(false);
  const [agora, setAgora] = useState(Date.now());

  // Relógio só para expirar a frase "Fulano pulou a faixa".
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 2_000);
    return () => clearInterval(t);
  }, []);

  if (music.fase === 'indisponivel' || !music.plugin) return <ConectarPlugin music={music} />;
  const nome = music.plugin.nome;

  const pular = () => {
    if (pularTravado) return;
    setPularTravado(true);
    setTimeout(() => setPularTravado(false), 2_000);
    void music.enviar({ tipo: 'pular' });
  };

  let corpo: React.ReactNode;

  if (music.fase === 'fora') {
    corpo = (
      <>
        <Text style={styles.linha1}>{nome}</Text>
        {!music.plugin.online && (
          <Text style={styles.linha2}>O computador parece desligado agora.</Text>
        )}
        {music.aviso && <Text style={styles.linha2}>{music.aviso}</Text>}
        <Pressable onPress={() => void music.chamar()} style={styles.botaoLargo}>
          <Text style={styles.botaoTexto}>Chamar música</Text>
        </Pressable>
      </>
    );
  } else if (music.fase === 'chamando') {
    corpo = (
      <>
        <View style={styles.linhaStatus}>
          <ActivityIndicator size="small" color={COLORS.muted} />
          <Text style={styles.linha1}>Chamando… {nome}</Text>
        </View>
        <Text style={styles.linha2}>Costuma responder em até 10 s.</Text>
        <Pressable onPress={music.cancelar} style={styles.botaoPequeno}>
          <Text style={styles.botaoTexto}>Cancelar</Text>
        </Pressable>
      </>
    );
  } else if (music.fase === 'sem-resposta') {
    corpo = (
      <>
        <Text style={styles.linha1}>{nome} não respondeu.</Text>
        <Text style={styles.linha2}>O computador precisa estar ligado com o plugin aberto.</Text>
        <Pressable onPress={() => void music.chamar()} style={styles.botaoLargo}>
          <Text style={styles.botaoTexto}>Tentar de novo</Text>
        </Pressable>
      </>
    );
  } else {
    const e = music.estado;
    const tocando = e?.estado === 'tocando';
    const parado = !e || e.estado === 'parado';
    const secundaria =
      (music.naoConfirmou && 'O computador não confirmou.') ||
      ultimaAcao(music, agora) ||
      (music.silenciadoPorMim && 'Silenciada só para você') ||
      e?.playlist ||
      null;

    corpo = parado ? (
      <>
        <Text style={styles.linha1}>Nada tocando</Text>
        {secundaria && <Text style={styles.linha2}>{secundaria}</Text>}
        <Pressable onPress={() => setFolhaAberta(true)} style={styles.botaoLargo}>
          <Text style={styles.botaoTexto}>Escolher playlist</Text>
        </Pressable>
      </>
    ) : (
      <>
        <Text style={styles.faixa} numberOfLines={1}>
          {e?.faixa ?? '—'}
        </Text>
        {secundaria && (
          <Text style={styles.linha2} numberOfLines={1}>
            {secundaria}
          </Text>
        )}
        <View style={styles.linhaBotoes}>
          <Pressable
            onPress={() => void music.enviar({ tipo: tocando ? 'pausar' : 'continuar' })}
            disabled={music.pendente}
            style={styles.botaoGrande}
          >
            <Text style={styles.botaoTexto}>
              {music.pendente ? '…' : tocando ? '❚❚  Pausar' : '▶  Continuar'}
            </Text>
          </Pressable>
          <Pressable onPress={pular} disabled={pularTravado} style={styles.botaoGrande}>
            <Text style={styles.botaoTexto}>⏭  Pular</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => music.setSilenciadoPorMim(!music.silenciadoPorMim)}
          style={[styles.botaoLargo, music.silenciadoPorMim && styles.botaoAceso]}
        >
          <Text style={styles.botaoTexto}>
            {music.silenciadoPorMim ? 'Ouvir música de novo' : 'Silenciar só para mim'}
          </Text>
        </Pressable>
      </>
    );
  }

  const titulo =
    music.fase === 'na-sala' && music.estado?.estado === 'tocando'
      ? 'MÚSICA · tocando'
      : music.fase === 'na-sala' && music.estado?.estado === 'pausado'
        ? 'MÚSICA · pausada'
        : 'MÚSICA';

  return (
    <View style={styles.card}>
      <View style={styles.cabecalho}>
        <Text style={styles.rotulo}>{titulo}</Text>
        {music.fase === 'na-sala' && (
          <Pressable onPress={() => setFolhaAberta(true)} hitSlop={14}>
            <Text style={styles.abrir}>Abrir ›</Text>
          </Pressable>
        )}
      </View>
      {corpo}
      <MusicSheet
        visivel={folhaAberta}
        aoFechar={() => setFolhaAberta(false)}
        music={music}
        podeDispensar={souLider || music.estado?.chamadoPor === music.identidadeLocal}
      />
    </View>
  );
};

/**
 * Sem plugin no comboio: só uma linha discreta. Quem tem o código (mostrado
 * no painel do computador onde o plugin roda) digita aqui uma vez; o resto do
 * comboio passa a ver a música sem fazer nada.
 */
const ConectarPlugin: React.FC<{ music: MusicPlugin }> = ({ music }) => {
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <Pressable onPress={() => setAberto(true)} style={styles.linhaConectar} hitSlop={6}>
        <Text style={styles.linha2}>Tem um plugin, como música? Conectar com código</Text>
      </Pressable>
    );
  }

  const conectar = async () => {
    setEnviando(true);
    setErro(null);
    const falha = await music.parear(codigo);
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
  faixa: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
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
