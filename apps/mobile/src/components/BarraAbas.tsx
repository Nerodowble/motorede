import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ALVO, COLORS, ESPACO, RAIO } from '../theme';
import type { NomeIcone } from './ui/Botao';

/**
 * Cabeçalho e barra de abas do app.
 *
 * A barra tem ícone + rótulo de 13 px em cada aba, e o alvo inteiro da coluna
 * é tocável (bem acima de 48 px de altura): o rótulo de 12 px em cinza
 * #64748b de antes falhava contraste e era difícil de acertar de luva.
 */

export type Aba = 'comboio' | 'socorro' | 'moto' | 'ajustes';

const ABAS: Array<{ id: Aba; rotulo: string; icone: NomeIcone; iconeAtivo: NomeIcone }> = [
  { id: 'comboio', rotulo: 'Comboio', icone: 'radio-outline', iconeAtivo: 'radio' },
  { id: 'socorro', rotulo: 'SOS', icone: 'medkit-outline', iconeAtivo: 'medkit' },
  { id: 'moto', rotulo: 'Moto', icone: 'speedometer-outline', iconeAtivo: 'speedometer' },
  { id: 'ajustes', rotulo: 'Ajustes', icone: 'settings-outline', iconeAtivo: 'settings' },
];

export const Cabecalho: React.FC<{
  topo: number;
  nome: string;
  verificado: boolean;
}> = ({ topo, nome, verificado }) => (
  <View style={[styles.cabecalho, { paddingTop: topo + ESPACO.md }]}>
    <Image
      source={require('../../assets/marca-pino.png')}
      style={styles.logo}
      accessibilityIgnoresInvertColors
    />
    {/* Como na logo: MOTO em branco, REDE em vermelho. */}
    <Text style={styles.marca} accessibilityLabel="MotoRede">
      MOTO<Text style={styles.marcaRede}>REDE</Text>
    </Text>
    <View style={styles.usuario}>
      {verificado && (
        <Ionicons name="checkmark-circle" size={14} color={COLORS.inkMuted} />
      )}
      <Text style={styles.usuarioTexto} numberOfLines={1}>
        {nome}
      </Text>
    </View>
  </View>
);

export const BarraAbas: React.FC<{
  aba: Aba;
  aoEscolher: (aba: Aba) => void;
  base: number;
  /** Há chamado de socorro ativo: só então a aba SOS fica vermelha. */
  sosAtivo: boolean;
}> = ({ aba, aoEscolher, base, sosAtivo }) => (
  // A barra guarda embaixo o espaço dos botões do aparelho. Onde o celular
  // usa gestos em vez de botões, `base` é pequeno ou zero, e o mínimo de 8
  // evita que os rótulos encostem na borda da tela.
  <View style={[styles.barra, { paddingBottom: Math.max(base, ESPACO.sm) }]}>
    {ABAS.map(({ id, rotulo, icone, iconeAtivo }) => {
      const ativa = aba === id;
      const alerta = id === 'socorro' && sosAtivo;
      const cor = ativa ? COLORS.ink : COLORS.inkMuted;
      return (
        <Pressable
          key={id}
          onPress={() => aoEscolher(id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: ativa }}
          accessibilityLabel={alerta ? `${rotulo}, chamado ativo` : rotulo}
          style={styles.item}
        >
          <View style={[styles.indicador, ativa && styles.indicadorAtivo]} />
          <View style={[styles.iconeFundo, alerta && styles.iconeAlerta]}>
            <Ionicons
              name={ativa ? iconeAtivo : icone}
              size={24}
              color={alerta ? COLORS.onSos : cor}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.itemTexto, { color: cor }, ativa && styles.itemTextoAtivo]}
          >
            {rotulo}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.lg,
    paddingBottom: ESPACO.md,
    backgroundColor: COLORS.canvas,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  logo: { width: 34, height: 34 },
  marca: { color: COLORS.ink, fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  marcaRede: { color: COLORS.brandText },
  usuario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: ESPACO.xs,
    marginLeft: ESPACO.md,
  },
  usuarioTexto: { color: COLORS.inkMuted, fontSize: 13, flexShrink: 1 },
  barra: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  item: {
    flex: 1,
    minHeight: ALVO.grande,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: ESPACO.sm,
    paddingBottom: ESPACO.xs,
    gap: 2,
  },
  indicador: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  indicadorAtivo: { backgroundColor: COLORS.brand },
  iconeFundo: {
    width: 44,
    height: 30,
    borderRadius: RAIO.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeAlerta: { backgroundColor: COLORS.sos },
  itemTexto: { fontSize: 13, fontWeight: '600' },
  itemTextoAtivo: { fontWeight: '800' },
});
