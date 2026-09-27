import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { PluginAudio } from '../hooks/usePluginAudio';
import { ALVO, COLORS, ESPACO } from '../theme';
import { Folha } from './ui/Folha';
import { Botao } from './ui/Botao';
import { Ajuda, Campo, EstadoVazio, Rotulo, estilosBase } from './ui/Cartao';

/**
 * Folha do plugin: escolher lista, filtrar, embaralhar e dispensar.
 *
 * Pensada para uso parado (posto, antes de sair). Um toque numa linha já toca,
 * sem confirmação: o erro é barato e desfazer é pular.
 *
 * A busca filtra o que o plugin já publicou (nomes das listas e itens da
 * lista atual). Busca na biblioteca inteira fica para depois.
 */

interface PluginSheetProps {
  visivel: boolean;
  aoFechar: () => void;
  pluginAudio: PluginAudio;
  /** Só o líder e quem chamou dispensam: recolocar o plugin custa espera. */
  podeDispensar: boolean;
}

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const PluginSheet: React.FC<PluginSheetProps> = ({
  visivel,
  aoFechar,
  pluginAudio,
  podeDispensar,
}) => {
  const [busca, setBusca] = useState('');
  const e = pluginAudio.estado;
  const nome = pluginAudio.plugin?.nome ?? 'plugin';

  const termo = normalizar(busca.trim());
  const listas = useMemo(
    () => (e?.listas ?? []).filter((p) => !termo || normalizar(p.nome).includes(termo)),
    [e?.listas, termo]
  );
  const itens = useMemo(
    () =>
      (e?.itens ?? [])
        .map((titulo, indice) => ({ titulo, indice }))
        .filter((f) => !termo || normalizar(f.titulo).includes(termo)),
    [e?.itens, termo]
  );

  const dispensar = () =>
    Alert.alert('Dispensar o plugin?', 'Ele sai do comboio para todo mundo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Dispensar',
        style: 'destructive',
        onPress: () => {
          void pluginAudio.enviar({ tipo: 'sair' });
          aoFechar();
        },
      },
    ]);

  const semNada = (e?.listas.length ?? 0) === 0;

  return (
    <Folha visivel={visivel} aoFechar={aoFechar} titulo={nome}>
      <View>
        <Campo
          value={busca}
          onChangeText={setBusca}
          placeholder={`Buscar em ${nome}`}
          style={styles.busca}
        />
        <Ionicons name="search" size={20} color={COLORS.inkFaint} style={styles.lupa} />
      </View>

      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: ESPACO.xs }}>
        {semNada ? (
          <EstadoVazio icone="albums-outline" texto={`${nome} ainda não publicou nenhuma lista.`} />
        ) : (
          <>
            <Rotulo icone="albums-outline">Listas</Rotulo>
            {listas.map((p) => {
              const atual = p.nome === e?.lista;
              return (
                <Pressable
                  key={p.nome}
                  onPress={() => void pluginAudio.enviar({ tipo: 'tocar', lista: p.nome })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.linha, pressed && styles.pressionado]}
                >
                  <Ionicons
                    name={atual ? 'disc' : 'disc-outline'}
                    size={22}
                    color={atual ? COLORS.brand : COLORS.inkMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.linhaTitulo, atual && styles.atual]} numberOfLines={1}>
                      {p.nome}
                    </Text>
                    <Text style={styles.linhaSub}>{p.itens} itens</Text>
                  </View>
                </Pressable>
              );
            })}

            {e?.lista && itens.length > 0 && (
              <>
                <View style={{ marginTop: ESPACO.md }}>
                  <Rotulo icone="list-outline">Nesta lista</Rotulo>
                </View>
                {itens.map((f) => {
                  const atual = f.indice === e.indice;
                  return (
                    <Pressable
                      key={f.indice}
                      onPress={() =>
                        void pluginAudio.enviar({
                          tipo: 'tocar',
                          lista: e.lista!,
                          item: f.indice,
                        })
                      }
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.linha, pressed && styles.pressionado]}
                    >
                      {/* O item atual leva o ícone de tocando e a cor da marca, em vez
                          do "▶" em texto de antes. */}
                      <Ionicons
                        name={atual ? 'play' : 'musical-note-outline'}
                        size={20}
                        color={atual ? COLORS.brand : COLORS.inkFaint}
                      />
                      <Text
                        style={[styles.linhaTitulo, { flex: 1 }, atual && styles.atual]}
                        numberOfLines={1}
                      >
                        {f.titulo}
                      </Text>
                    </Pressable>
                  );
                })}
              </>
            )}

            {termo && listas.length === 0 && itens.length === 0 && (
              <EstadoVazio icone="search-outline" texto={`Nada com “${busca.trim()}” em ${nome}.`} />
            )}
          </>
        )}
      </ScrollView>

      <Ajuda>
        O volume do plugin vale só para este aparelho. Silenciar só para mim não afeta os
        outros.
      </Ajuda>

      <View style={estilosBase.linhaBotoes}>
        <Botao
          rotulo={`Embaralhar: ${e?.embaralhar ? 'ligado' : 'desligado'}`}
          icone="shuffle"
          flex
          onPress={() => void pluginAudio.enviar({ tipo: 'embaralhar', ligado: !e?.embaralhar })}
        />
        {podeDispensar && (
          <Botao rotulo="Dispensar plugin" icone="log-out-outline" variante="perigo" flex onPress={dispensar} />
        )}
      </View>
    </Folha>
  );
};

const styles = StyleSheet.create({
  busca: { paddingLeft: 44 },
  lupa: { position: 'absolute', left: ESPACO.md + 2, top: 16 },
  linha: {
    minHeight: ALVO.botao,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingVertical: ESPACO.xs,
  },
  pressionado: { opacity: 0.7 },
  linhaTitulo: { color: COLORS.ink, fontSize: 16, fontWeight: '600' },
  linhaSub: { color: COLORS.inkMuted, fontSize: 13 },
  atual: { fontWeight: '800' },
});
