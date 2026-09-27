import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ALVO, COLORS, ESPACO, RAIO } from '../../theme';

/**
 * Botão do app, em poucas variantes com papel fixo:
 *
 * - action: a ação principal da tela (Entrar no comboio, Salvar). Preto e
 *   branco, como a logo.
 * - secundario: tudo o mais que é botão.
 * - perigo: ação destrutiva — texto vermelho claro, fundo neutro. Vermelho
 *   cheio fica reservado para o SOS.
 * - sos: só o botão de pedir socorro.
 * - fantasma: link com alvo de botão (Cancelar, Fechar).
 */

export type VarianteBotao = 'action' | 'secundario' | 'perigo' | 'sos' | 'fantasma';

export type NomeIcone = React.ComponentProps<typeof Ionicons>['name'];

interface BotaoProps {
  rotulo: string;
  onPress: () => void;
  variante?: VarianteBotao;
  icone?: NomeIcone;
  disabled?: boolean;
  carregando?: boolean;
  /** Altura mínima. O padrão já serve de luva; 64+ para uso em movimento. */
  altura?: number;
  /** Ocupa a largura disponível numa linha de botões. */
  flex?: boolean;
  compacto?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const FUNDO: Record<VarianteBotao, string> = {
  action: COLORS.action,
  secundario: COLORS.elevated,
  perigo: COLORS.elevated,
  sos: COLORS.sos,
  fantasma: 'transparent',
};

const TINTA: Record<VarianteBotao, string> = {
  action: COLORS.onAction,
  secundario: COLORS.ink,
  perigo: COLORS.dangerText,
  sos: COLORS.onSos,
  fantasma: COLORS.inkMuted,
};

export const Botao: React.FC<BotaoProps> = ({
  rotulo,
  onPress,
  variante = 'secundario',
  icone,
  disabled = false,
  carregando = false,
  altura,
  flex = false,
  compacto = false,
  style,
  accessibilityLabel,
}) => {
  const tinta = TINTA[variante];
  const inativo = disabled || carregando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? rotulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: FUNDO[variante],
          minHeight: altura ?? (compacto ? ALVO.min : ALVO.botao),
          paddingHorizontal: compacto ? ESPACO.lg : ESPACO.xl,
        },
        flex && styles.flex,
        disabled && !carregando && styles.inativo,
        pressed && styles.pressionado,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={tinta} />
      ) : (
        <View style={styles.conteudo}>
          {icone && <Ionicons name={icone} size={compacto ? 18 : 20} color={tinta} />}
          <Text
            style={[styles.texto, compacto && styles.textoCompacto, { color: tinta }]}
            numberOfLines={1}
          >
            {rotulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

/** Botão só de ícone, quadrado, para a borda de um cartão (fechar, editar). */
export const BotaoIcone: React.FC<{
  icone: NomeIcone;
  onPress: () => void;
  rotulo: string;
  cor?: string;
  fundo?: boolean;
}> = ({ icone, onPress, rotulo, cor = COLORS.ink, fundo = true }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={rotulo}
    hitSlop={4}
    style={({ pressed }) => [
      styles.icone,
      fundo && { backgroundColor: COLORS.elevated },
      pressed && styles.pressionado,
    ]}
  >
    <Ionicons name={icone} size={22} color={cor} />
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    borderRadius: RAIO.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, paddingHorizontal: ESPACO.sm },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  texto: { fontSize: 16, fontWeight: '800' },
  textoCompacto: { fontSize: 14 },
  inativo: { opacity: 0.4 },
  pressionado: { opacity: 0.75 },
  icone: {
    width: ALVO.min,
    height: ALVO.min,
    borderRadius: RAIO.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
