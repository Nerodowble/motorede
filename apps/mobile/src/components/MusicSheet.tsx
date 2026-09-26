import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MusicPlugin } from '../hooks/useMusicPlugin';
import { COLORS } from '../theme';

/**
 * Folha de música: escolher playlist, filtrar, embaralhar e dispensar.
 *
 * Pensada para uso parado (posto, antes de sair). Um toque numa linha já toca,
 * sem confirmação: o erro é barato e desfazer é pular.
 *
 * A busca filtra o que o plugin já publicou (nomes das playlists e faixas da
 * playlist atual). Busca na biblioteca inteira fica para depois.
 */

interface MusicSheetProps {
  visivel: boolean;
  aoFechar: () => void;
  music: MusicPlugin;
  /** Só o líder e quem chamou dispensam: recolocar a música custa espera. */
  podeDispensar: boolean;
}

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const MusicSheet: React.FC<MusicSheetProps> = ({
  visivel,
  aoFechar,
  music,
  podeDispensar,
}) => {
  const [busca, setBusca] = useState('');
  const e = music.estado;
  const nome = music.plugin?.nome ?? 'plugin';

  const termo = normalizar(busca.trim());
  const playlists = useMemo(
    () => (e?.playlists ?? []).filter((p) => !termo || normalizar(p.nome).includes(termo)),
    [e?.playlists, termo]
  );
  const faixas = useMemo(
    () =>
      (e?.faixas ?? [])
        .map((titulo, indice) => ({ titulo, indice }))
        .filter((f) => !termo || normalizar(f.titulo).includes(termo)),
    [e?.faixas, termo]
  );

  const dispensar = () =>
    Alert.alert('Dispensar música?', 'A música sai do comboio para todo mundo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Dispensar',
        style: 'destructive',
        onPress: () => {
          void music.enviar({ tipo: 'sair' });
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
            void music.enviar({ tipo: 'sair' });
            void music.desparear();
            aoFechar();
          },
        },
      ]
    );

  const semNada = (e?.playlists.length ?? 0) === 0;

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <View style={styles.fundo}>
        <View style={styles.folha}>
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>Música</Text>
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
                Nenhuma playlist em {nome}. As playlists são pastas de áudio montadas no
                computador.
              </Text>
            ) : (
              <>
                <Text style={styles.rotulo}>PLAYLISTS</Text>
                {playlists.map((p) => (
                  <Pressable
                    key={p.nome}
                    onPress={() => void music.enviar({ tipo: 'tocar', playlist: p.nome })}
                    style={styles.linha}
                  >
                    <Text
                      style={[styles.linhaTitulo, p.nome === e?.playlist && styles.atual]}
                      numberOfLines={1}
                    >
                      {p.nome}
                    </Text>
                    <Text style={styles.linhaSub}>{p.faixas} faixas</Text>
                  </Pressable>
                ))}

                {e?.playlist && faixas.length > 0 && (
                  <>
                    <Text style={[styles.rotulo, { marginTop: 10 }]}>NESTA PLAYLIST</Text>
                    {faixas.map((f) => (
                      <Pressable
                        key={f.indice}
                        onPress={() =>
                          void music.enviar({
                            tipo: 'tocar',
                            playlist: e.playlist!,
                            faixa: f.indice,
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

                {termo && playlists.length === 0 && faixas.length === 0 && (
                  <Text style={styles.ajuda}>
                    Nada com “{busca.trim()}” em {nome}.
                  </Text>
                )}
              </>
            )}
          </ScrollView>

          <Text style={styles.ajuda}>
            A música abaixa sozinha quando alguém fala. Silenciar só para mim não afeta os
            outros.
          </Text>

          <View style={styles.rodape}>
            <Pressable
              onPress={() => void music.enviar({ tipo: 'embaralhar', ligado: !e?.embaralhar })}
              style={styles.botao}
            >
              <Text style={styles.botaoTexto}>
                Embaralhar: {e?.embaralhar ? 'ligado' : 'desligado'}
              </Text>
            </Pressable>
            {podeDispensar && (
              <Pressable onPress={dispensar} style={styles.botao} hitSlop={8}>
                <Text style={[styles.botaoTexto, { color: COLORS.danger }]}>
                  Dispensar música
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
