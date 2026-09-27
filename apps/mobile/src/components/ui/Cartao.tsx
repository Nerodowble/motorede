import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, ESPACO, RAIO, TIPO } from '../../theme';
import type { NomeIcone } from './Botao';

/**
 * Peças de layout repetidas em todas as telas. Ficam aqui para que cartão,
 * rótulo e campo tenham o mesmo raio, borda e espaçamento em todo lugar —
 * a falta disso era boa parte do "simples demais".
 */

export const Cartao: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Borda de destaque (ex.: chamado ativo). */
  destaque?: string;
}> = ({ children, style, destaque }) => (
  <View style={[styles.cartao, destaque ? { borderColor: destaque } : null, style]}>
    {children}
  </View>
);

/** Rótulo de seção em caixa-alta, com ícone opcional e algo à direita. */
export const Rotulo: React.FC<{
  children: React.ReactNode;
  icone?: NomeIcone;
  cor?: string;
  direita?: React.ReactNode;
}> = ({ children, icone, cor = COLORS.inkMuted, direita }) => (
  <View style={styles.linhaRotulo}>
    {icone && <Ionicons name={icone} size={16} color={cor} />}
    <Text style={[TIPO.rotulo, { color: cor, flex: 1 }]}>{children}</Text>
    {direita}
  </View>
);

/** Título de cartão com ícone num quadradinho, para dar ponto de entrada ao olho. */
export const TituloCartao: React.FC<{
  children: React.ReactNode;
  icone?: NomeIcone;
  cor?: string;
}> = ({ children, icone, cor = COLORS.ink }) => (
  <View style={styles.linhaTitulo}>
    {icone && (
      <View style={styles.selo}>
        <Ionicons name={icone} size={18} color={cor} />
      </View>
    )}
    <Text style={[TIPO.tituloCard, { flex: 1 }]}>{children}</Text>
  </View>
);

/** Estado vazio: ícone e uma frase, em vez de um texto cinza solto. */
export const EstadoVazio: React.FC<{ icone: NomeIcone; texto: string }> = ({
  icone,
  texto,
}) => (
  <View style={styles.vazio}>
    <Ionicons name={icone} size={28} color={COLORS.inkFaint} />
    <Text style={[TIPO.apoio, styles.vazioTexto]}>{texto}</Text>
  </View>
);

/** Campo de texto com a borda forte (visível) e o fundo elevado. */
export const Campo = React.forwardRef<TextInput, TextInputProps & { erro?: boolean }>(
  ({ style, erro, ...props }, ref) => (
    <TextInput
      ref={ref}
      placeholderTextColor={COLORS.inkFaint}
      selectionColor={COLORS.brand}
      {...props}
      style={[styles.campo, erro && { borderColor: COLORS.dangerText }, style]}
    />
  )
);
Campo.displayName = 'Campo';

/** Linha de apoio (texto de ajuda) padronizada. */
export const Ajuda: React.FC<{ children: React.ReactNode; cor?: string }> = ({
  children,
  cor,
}) => <Text style={[TIPO.apoio, cor ? { color: cor } : null]}>{children}</Text>;

export const estilosBase = StyleSheet.create({
  conteudo: { padding: ESPACO.lg, gap: ESPACO.md, paddingBottom: ESPACO.xxl },
  linhaBotoes: { flexDirection: 'row', gap: ESPACO.md },
  erro: { color: COLORS.dangerText, fontSize: 13, lineHeight: 18 },
  divisoria: { height: 1, backgroundColor: COLORS.line },
});

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: COLORS.surface,
    borderRadius: RAIO.lg,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: ESPACO.lg,
    gap: ESPACO.md,
  },
  linhaRotulo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
  selo: {
    width: 36,
    height: 36,
    borderRadius: RAIO.sm,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazio: { alignItems: 'center', gap: ESPACO.sm, paddingVertical: ESPACO.lg },
  vazioTexto: { textAlign: 'center' },
  campo: {
    minHeight: 52,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    borderRadius: RAIO.md,
    paddingHorizontal: ESPACO.lg,
    paddingVertical: ESPACO.md,
    color: COLORS.ink,
    fontSize: 16,
  },
});
