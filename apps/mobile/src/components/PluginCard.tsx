import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { PluginAudio } from '../hooks/usePluginAudio';
import { PluginSheet } from './PluginSheet';
import { ConectarPlugin, Rodape, Seletor, Volume } from './PluginPartes';
import { SinalPlugin } from './SinalPlugin';
import { Botao } from './ui/Botao';
import { Ajuda, Cartao, Rotulo, estilosBase } from './ui/Cartao';
import { ALVO, COLORS, ESPACO, RAIO } from '../theme';

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
  'som-bluetooth': 'ligou o som para fone Bluetooth',
  'som-normal': 'voltou o som normal',
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
        {!pluginAudio.plugin.online && <Ajuda>O computador parece desligado agora.</Ajuda>}
        {pluginAudio.aviso && <Ajuda>{pluginAudio.aviso}</Ajuda>}
        <Botao
          rotulo="Chamar plugin"
          icone="enter-outline"
          onPress={() => void pluginAudio.chamar()}
        />
      </>
    );
  } else if (pluginAudio.fase === 'chamando') {
    corpo = (
      <>
        <View style={styles.linhaStatus}>
          <ActivityIndicator size="small" color={COLORS.inkMuted} />
          <Text style={styles.linha1}>Chamando… {nome}</Text>
        </View>
        <Ajuda>Costuma responder em até 10 s.</Ajuda>
        <Botao rotulo="Cancelar" compacto style={styles.alinhaInicio} onPress={pluginAudio.cancelar} />
      </>
    );
  } else if (pluginAudio.fase === 'sem-resposta') {
    corpo = (
      <>
        <Text style={styles.linha1}>{nome} não respondeu.</Text>
        <Ajuda>O computador precisa estar ligado com o plugin aberto.</Ajuda>
        <Botao rotulo="Tentar de novo" icone="refresh" onPress={() => void pluginAudio.chamar()} />
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
        <View style={styles.faixa}>
          <View style={styles.capa}>
            <Ionicons name="musical-notes" size={24} color={COLORS.inkMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linha1}>Nada tocando</Text>
            {secundaria && <Ajuda>{secundaria}</Ajuda>}
          </View>
        </View>
        <Botao rotulo="Escolher lista" icone="albums-outline" onPress={() => setFolhaAberta(true)} />
      </>
    ) : (
      <>
        <View style={styles.faixa}>
          <View style={styles.capa}>
            <Ionicons name="musical-note" size={24} color={COLORS.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.item} numberOfLines={1}>
              {e?.item ?? '—'}
            </Text>
            {secundaria && (
              <Text style={styles.secundaria} numberOfLines={1}>
                {secundaria}
              </Text>
            )}
          </View>
        </View>
        <View style={estilosBase.linhaBotoes}>
          <ControleGrande
            icone={tocando ? 'pause' : 'play'}
            rotulo={tocando ? 'Pausar' : 'Continuar'}
            pendente={pluginAudio.pendente}
            onPress={() => void pluginAudio.enviar({ tipo: tocando ? 'pausar' : 'continuar' })}
          />
          <ControleGrande
            icone="play-skip-forward"
            rotulo="Pular"
            disabled={pularTravado}
            onPress={pular}
          />
        </View>
        <Volume pluginAudio={pluginAudio} />
        <SinalPlugin room={pluginAudio.room} identidade={pluginAudio.plugin?.identidade ?? null} />
      </>
    );
  }

  const titulo =
    pluginAudio.fase === 'na-sala' && pluginAudio.estado?.estado === 'tocando'
      ? 'Plugin · tocando'
      : pluginAudio.fase === 'na-sala' && pluginAudio.estado?.estado === 'pausado'
        ? 'Plugin · pausado'
        : 'Plugin';

  return (
    <Cartao>
      <Rotulo
        icone="musical-notes-outline"
        direita={
          pluginAudio.fase === 'na-sala' && (
            <Pressable
              onPress={() => setFolhaAberta(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Abrir plugin"
              style={styles.abrir}
            >
              <Text style={styles.abrirTexto}>Abrir</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.inkMuted} />
            </Pressable>
          )
        }
      >
        {titulo}
      </Rotulo>
      {pluginAudio.plugins.length > 1 && <Seletor pluginAudio={pluginAudio} />}
      {corpo}
      <Rodape pluginAudio={pluginAudio} />
      <PluginSheet
        visivel={folhaAberta}
        aoFechar={() => setFolhaAberta(false)}
        pluginAudio={pluginAudio}
        podeDispensar={souLider || pluginAudio.estado?.chamadoPor === pluginAudio.identidadeLocal}
      />
    </Cartao>
  );
};

/** Botão de 64 px com ícone em cima e verbo embaixo: acerta de luva. */
const ControleGrande: React.FC<{
  icone: React.ComponentProps<typeof Ionicons>['name'];
  rotulo: string;
  onPress: () => void;
  disabled?: boolean;
  pendente?: boolean;
}> = ({ icone, rotulo, onPress, disabled = false, pendente = false }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || pendente}
    accessibilityRole="button"
    accessibilityLabel={rotulo}
    style={({ pressed }) => [
      styles.controle,
      disabled && { opacity: 0.4 },
      pressed && { opacity: 0.75 },
    ]}
  >
    {pendente ? (
      <ActivityIndicator color={COLORS.ink} />
    ) : (
      <>
        <Ionicons name={icone} size={28} color={COLORS.ink} />
        <Text style={styles.controleTexto}>{rotulo}</Text>
      </>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  abrir: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  abrirTexto: { color: COLORS.inkMuted, fontSize: 14, fontWeight: '700' },
  linhaStatus: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  linha1: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  item: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  secundaria: { color: COLORS.inkMuted, fontSize: 13, marginTop: 2 },
  faixa: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
  capa: {
    width: 48,
    height: 48,
    borderRadius: RAIO.sm,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alinhaInicio: { alignSelf: 'flex-start' },
  controle: {
    flex: 1,
    minHeight: ALVO.grande + 8,
    backgroundColor: COLORS.elevated,
    borderRadius: RAIO.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  controleTexto: { color: COLORS.ink, fontWeight: '800', fontSize: 14 },
});
