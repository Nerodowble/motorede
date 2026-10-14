import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ALVO, COLORS, ESPACO, FONTE_CONDENSADA, TIPO } from '../../theme';

/**
 * O painel "tela de seleção de jogo" por cima da capa. É desenhado aqui, e não
 * pela IA, para que marca, modelo, ano e apelido saiam exatos.
 *
 * Títulos de jogo em inglês (GARAGE, BIKE SELECT) funcionam como ícone; o que é
 * dado vai em português. Sem barras de "Agility/Style": seriam números
 * inventados sobre uma moto real.
 */
export const HudGaragem: React.FC<{
  brand: string;
  model: string;
  year: number;
  nickname?: string;
  aoDarApelido?: () => void;
  compacta?: boolean;
}> = ({ brand, model, year, nickname, aoDarApelido, compacta = false }) => (
  <View style={styles.hud} pointerEvents="box-none">
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.traco} />
      <Text style={[TIPO.rotulo, styles.garage]}>GARAGE</Text>
      <Text style={[styles.titulo, compacta && styles.tituloCompacto]} numberOfLines={1}>BIKE SELECT</Text>
    </View>
    <View style={styles.painel} pointerEvents="box-none">
      <Campo rotulo="MARCA" valor={brand} compacta={compacta} />
      <Campo rotulo="MODELO" valor={model} linhas={2} compacta={compacta} />
      <Campo rotulo="ANO" valor={String(year)} compacta={compacta} />
      {nickname ? (
        <Campo rotulo="APELIDO" valor={`"${nickname}"`} compacta={compacta} />
      ) : aoDarApelido ? (
        <Pressable onPress={aoDarApelido} accessibilityRole="button" accessibilityLabel="Dar apelido à moto" style={styles.darApelido}>
          <Text style={styles.darApelidoTexto}>+ Dar apelido</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);

const Campo: React.FC<{ rotulo: string; valor: string; linhas?: number; compacta: boolean }> = ({ rotulo, valor, linhas = 1, compacta }) => (
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Text style={TIPO.rotulo}>{rotulo}</Text>
    <Text style={[styles.valor, compacta && styles.valorCompacto]} numberOfLines={linhas}>{valor}</Text>
  </View>
);

const styles = StyleSheet.create({
  hud: { position: 'absolute', top: ESPACO.lg, left: ESPACO.lg, width: '52%', gap: ESPACO.lg },
  traco: { width: 24, height: 3, backgroundColor: COLORS.brand, marginBottom: ESPACO.sm },
  garage: { letterSpacing: 2.4 },
  titulo: { color: COLORS.ink, fontSize: 28, fontWeight: '800', fontFamily: FONTE_CONDENSADA, letterSpacing: 1, marginTop: 2 },
  tituloCompacto: { fontSize: 20 },
  painel: { borderLeftWidth: 2, borderLeftColor: COLORS.lineStrong, paddingLeft: ESPACO.md, gap: ESPACO.md },
  valor: { color: COLORS.ink, fontSize: 20, fontWeight: '800', fontFamily: FONTE_CONDENSADA },
  valorCompacto: { fontSize: 15 },
  darApelido: { minHeight: ALVO.min, justifyContent: 'center' },
  darApelidoTexto: { color: COLORS.inkMuted, fontSize: 16, fontWeight: '700' },
});
