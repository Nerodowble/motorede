import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AJUDA_MOTO, type ChaveAjudaMoto } from '@motorede/shared';
import { Botao } from './ui/Botao';
import { Folha } from './ui/Folha';
import { COLORS, ESPACO, TIPO } from '../theme';

/**
 * Botão "i" que explica um campo de cálculo em linguagem simples — o mesmo
 * texto da web.
 *
 * Pulsa até o piloto abrir aquela explicação uma vez; depois fica parado,
 * em todos os cartões que usam a mesma explicação, e o app lembra disso.
 */

const CHAVE_LIDAS = 'motorede_ajudas_lidas';
const ouvintes = new Set<() => void>();
let lidas = new Set<string>();

AsyncStorage.getItem(CHAVE_LIDAS)
  .then((raw) => {
    if (!raw) return;
    lidas = new Set([...lidas, ...(JSON.parse(raw) as string[])]);
    ouvintes.forEach((f) => f());
  })
  .catch(() => {});

function marcarLida(chave: string) {
  if (lidas.has(chave)) return;
  lidas = new Set(lidas).add(chave);
  void AsyncStorage.setItem(CHAVE_LIDAS, JSON.stringify([...lidas])).catch(() => {});
  ouvintes.forEach((f) => f());
}

const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};

export const InfoAjuda: React.FC<{ chave: ChaveAjudaMoto }> = ({ chave }) => {
  const [aberta, setAberta] = useState(false);
  const jaLida = useSyncExternalStore(assinar, () => lidas.has(chave));
  const pulso = useRef(new Animated.Value(0)).current;
  const ajuda = AJUDA_MOTO[chave];

  useEffect(() => {
    if (jaLida) return;
    const loop = Animated.loop(
      Animated.timing(pulso, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      pulso.setValue(0);
    };
  }, [jaLida, pulso]);

  return (
    <>
      <Pressable
        onPress={() => {
          setAberta(true);
          marcarLida(chave);
        }}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel={`Como funciona: ${ajuda.titulo}`}
        style={styles.alvo}
      >
        {!jaLida && (
          <Animated.View
            style={[
              styles.anel,
              {
                opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
              },
            ]}
          />
        )}
        <View style={styles.circulo}>
          <Text style={styles.letra}>i</Text>
        </View>
      </Pressable>

      <Folha visivel={aberta} aoFechar={() => setAberta(false)} titulo={ajuda.titulo}>
        {ajuda.paragrafos.map((p) => (
          <Text key={p} style={styles.paragrafo}>
            {p}
          </Text>
        ))}
        <Botao rotulo="Entendi" variante="action" onPress={() => setAberta(false)} />
      </Folha>
    </>
  );
};

const TAMANHO = 22;

const styles = StyleSheet.create({
  alvo: { width: TAMANHO, height: TAMANHO, alignItems: 'center', justifyContent: 'center' },
  anel: {
    position: 'absolute',
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: TAMANHO / 2,
    backgroundColor: COLORS.brand,
  },
  circulo: {
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: TAMANHO / 2,
    borderWidth: 1.5,
    borderColor: COLORS.brandText,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letra: { color: COLORS.ink, fontSize: 13, fontWeight: '800', fontStyle: 'italic', lineHeight: 15 },
  paragrafo: { ...TIPO.apoio, fontSize: 16, lineHeight: 23, marginBottom: ESPACO.xs },
});
