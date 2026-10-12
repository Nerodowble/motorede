import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  INTERVAL_MAX_KM,
  INTERVAL_MIN_KM,
  MAINTENANCE_LABELS,
  OIL_INTERVAL_SUGGESTIONS,
  type ConsumableCategory,
} from '@motorede/shared';
import { Campo, Rotulo, estilosBase } from './ui/Cartao';
import { Botao } from './ui/Botao';
import { Folha } from './ui/Folha';
import { InfoAjuda } from './InfoAjuda';
import { ALVO, COLORS, ESPACO, RAIO } from '../theme';

/**
 * "Troco a cada ___ km". No óleo, atalhos com os números mais comuns — a
 * maioria troca de 1.000 em 1.000 e não deveria precisar digitar.
 */
export const CampoIntervalo: React.FC<{
  category: ConsumableCategory;
  valor: string;
  onChange: (v: string) => void;
  erro?: boolean;
  autoFocus?: boolean;
}> = ({ category, valor, onChange, erro, autoFocus }) => (
  <View style={styles.bloco}>
    <View style={styles.linha}>
      <Rotulo>TROCO A CADA (KM)</Rotulo>
      <InfoAjuda chave="intervalo" />
    </View>
    <Campo
      value={valor}
      onChangeText={onChange}
      keyboardType="number-pad"
      autoFocus={autoFocus}
      erro={erro}
      placeholder={category === 'engine_oil' ? 'ex: 1000' : 'veja no manual ou pergunte ao mecânico'}
      accessibilityLabel="De quantos em quantos km você troca"
    />
    {erro && (
      <Text style={estilosBase.erro}>
        Digite um número entre {INTERVAL_MIN_KM.toLocaleString('pt-BR')} e{' '}
        {INTERVAL_MAX_KM.toLocaleString('pt-BR')} km, ou deixe vazio.
      </Text>
    )}
    {category === 'engine_oil' && (
      <View style={styles.atalhos}>
        {OIL_INTERVAL_SUGGESTIONS.map((km) => {
          const ativo = valor === String(km);
          return (
            <Pressable
              key={km}
              onPress={() => onChange(String(km))}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              style={[styles.atalho, ativo && styles.atalhoAtivo]}
            >
              <Text style={[styles.atalhoTexto, ativo && styles.atalhoTextoAtivo]}>
                {km.toLocaleString('pt-BR')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    )}
  </View>
);

/** Folha só para informar o intervalo, sem registrar troca. */
export const FolhaIntervalo: React.FC<{
  categoria: ConsumableCategory | null;
  valor: string;
  onChange: (v: string) => void;
  erro: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
}> = ({ categoria, valor, onChange, erro, aoFechar, aoSalvar }) => (
  <Folha
    visivel={categoria !== null}
    aoFechar={aoFechar}
    titulo={categoria ? MAINTENANCE_LABELS[categoria] : ''}
  >
    {categoria && (
      <CampoIntervalo category={categoria} valor={valor} onChange={onChange} erro={erro} autoFocus />
    )}
    <Botao rotulo="Salvar" variante="action" onPress={aoSalvar} />
    <Botao rotulo="Cancelar" variante="fantasma" onPress={aoFechar} />
  </Folha>
);

const styles = StyleSheet.create({
  bloco: { gap: ESPACO.sm },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  atalho: {
    minHeight: ALVO.min,
    paddingHorizontal: ESPACO.lg,
    borderRadius: RAIO.md,
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    backgroundColor: COLORS.elevated,
    justifyContent: 'center',
  },
  atalhoAtivo: { backgroundColor: COLORS.action, borderColor: COLORS.action },
  atalhoTexto: { color: COLORS.ink, fontSize: 15, fontWeight: '700' },
  atalhoTextoAtivo: { color: COLORS.onAction },
});
