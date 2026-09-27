import React from 'react';
import { Modal, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, ESPACO, RAIO, TIPO } from '../../theme';
import { BotaoIcone } from './Botao';

/**
 * Folha que sobe de baixo (painel de comboios, plugin, registro de troca).
 * Um só desenho para todas: puxador, título, botão de fechar grande, e o
 * espaço dos botões do aparelho respeitado embaixo.
 */
export const Folha: React.FC<{
  visivel: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ visivel, aoFechar, titulo, children, style }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <View style={styles.fundo}>
        <View
          style={[styles.folha, { paddingBottom: Math.max(insets.bottom, ESPACO.lg) + ESPACO.sm }, style]}
        >
          <View style={styles.puxador} />
          <View style={styles.cabecalho}>
            <Text style={[TIPO.tituloCard, { flex: 1 }]} numberOfLines={1}>
              {titulo}
            </Text>
            <BotaoIcone icone="close" onPress={aoFechar} rotulo="Fechar" />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  folha: {
    maxHeight: '92%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RAIO.lg + 6,
    borderTopRightRadius: RAIO.lg + 6,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: ESPACO.xl - 4,
    paddingTop: ESPACO.sm,
    gap: ESPACO.md,
  },
  puxador: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lineStrong,
    marginBottom: ESPACO.xs,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
});
