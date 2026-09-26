import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PluginAudio } from '../hooks/usePluginAudio';
import { COLORS } from '../theme';

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

  const desvincular = () =>
    Alert.alert(
      'Desvincular?',
      `${nome} some deste comboio. Para voltar, alguém digita o código de novo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: () => {
            void pluginAudio.enviar({ tipo: 'sair' });
            void pluginAudio.desparear();
            aoFechar();
          },
        },
      ]
    );

  const semNada = (e?.listas.length ?? 0) === 0;

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <View style={styles.fundo}>
        <View style={styles.folha}>
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>{nome}</Text>
            <Pressable onPress={aoFechar} hitSlop={14}>
              <Text style={styles.fechar}>Fechar</Text>
            </Pressable>
          </View>

          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder={`Buscar em ${nome}`}
            placeholderTextColor={COLORS.faint}
            style={styles.input}
          />

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 4 }}>
            {semNada ? (
              <Text style={styles.ajuda}>
                {nome} ainda não publicou nenhuma lista.
              </Text>
            ) : (
              <>
                <Text style={styles.rotulo}>LISTAS</Text>
                {listas.map((p) => (
                  <Pressable
                    key={p.nome}
                    onPress={() => void pluginAudio.enviar({ tipo: 'tocar', lista: p.nome })}
                    style={styles.linha}
                  >
                    <Text
                      style={[styles.linhaTitulo, p.nome === e?.lista && styles.atual]}
                      numberOfLines={1}
                    >
                      {p.nome}
                    </Text>
                    <Text style={styles.linhaSub}>{p.itens} itens</Text>
                  </Pressable>
                ))}

                {e?.lista && itens.length > 0 && (
                  <>
                    <Text style={[styles.rotulo, { marginTop: 10 }]}>NESTA LISTA</Text>
                    {itens.map((f) => (
                      <Pressable
                        key={f.indice}
                        onPress={() =>
                          void pluginAudio.enviar({
                            tipo: 'tocar',
                            lista: e.lista!,
                            item: f.indice,
                          })
                        }
                        style={styles.linha}
                      >
                        <Text
                          style={[styles.linhaTitulo, f.indice === e.indice && styles.atual]}
                          numberOfLines={1}
                        >
                          {f.indice === e.indice ? '▶  ' : ''}
                          {f.titulo}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}

                {termo && listas.length === 0 && itens.length === 0 && (
                  <Text style={styles.ajuda}>
                    Nada com “{busca.trim()}” em {nome}.
                  </Text>
                )}
              </>
            )}
          </ScrollView>

          <Text style={styles.ajuda}>
            O volume do plugin vale só para este aparelho. Silenciar só para mim não afeta os
            outros.
          </Text>

          <View style={styles.rodape}>
            <Pressable
              onPress={() => void pluginAudio.enviar({ tipo: 'embaralhar', ligado: !e?.embaralhar })}
              style={styles.botao}
            >
              <Text style={styles.botaoTexto}>
                Embaralhar: {e?.embaralhar ? 'ligado' : 'desligado'}
              </Text>
            </Pressable>
            {podeDispensar && (
              <Pressable onPress={dispensar} style={styles.botao} hitSlop={8}>
                <Text style={[styles.botaoTexto, { color: COLORS.danger }]}>
                  Dispensar plugin
                </Text>
              </Pressable>
            )}
          </View>

          {podeDispensar && (
            <Pressable onPress={desvincular} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={styles.ajuda}>Desvincular {nome} deste comboio</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  folha: {
    maxHeight: '92%',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 20,
    gap: 12,
  },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  fechar: { color: COLORS.muted, fontSize: 12 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  rotulo: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  linha: {
    minHeight: 56,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  linhaTitulo: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  linhaSub: { color: COLORS.muted, fontSize: 12 },
  atual: { color: COLORS.text, fontWeight: '800', textDecorationLine: 'underline' },
  ajuda: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  rodape: { flexDirection: 'row', gap: 12 },
  botao: {
    flex: 1,
    minHeight: 48,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
});
