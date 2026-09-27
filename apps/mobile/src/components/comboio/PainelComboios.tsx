import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CONVOY_CAPACITY, normalizePhone } from '@motorede/shared';
import type { useConvoyBrowser } from '../../hooks/useConvoyBrowser';
import { ALVO, COLORS, ESPACO, RAIO, TIPO } from '../../theme';
import { Folha } from '../ui/Folha';
import { Botao } from '../ui/Botao';
import { Ajuda, Campo, EstadoVazio } from '../ui/Cartao';

/**
 * Navegador de comboios e busca por telefone. Uso parado: fica numa folha,
 * fora da tela principal.
 */

type Navegador = ReturnType<typeof useConvoyBrowser>;

export const PainelComboios: React.FC<{
  visivel: boolean;
  aoFechar: () => void;
  browser: Navegador;
  idToken: string | null;
  codigoAtual: string;
  aoEntrar: (codigo: string) => void;
}> = ({ visivel, aoFechar, browser, idToken, codigoAtual, aoEntrar }) => {
  const [buscaTelefone, setBuscaTelefone] = useState('');

  return (
    <Folha visivel={visivel} aoFechar={aoFechar} titulo="Comboios ativos">
      <View style={styles.linha}>
        <Campo
          value={buscaTelefone}
          onChangeText={setBuscaTelefone}
          placeholder="Achar piloto pelo telefone"
          keyboardType="phone-pad"
          style={{ flex: 1 }}
        />
        <Botao
          rotulo="Buscar"
          icone="search"
          compacto
          altura={52}
          onPress={() =>
            void browser.refresh({ phone: normalizePhone(buscaTelefone), idToken })
          }
        />
      </View>

      {browser.searched && !browser.found && (
        <Ajuda>Ninguém com esse telefone está em comboio agora.</Ajuda>
      )}

      {browser.found && (
        <Pressable
          onPress={() => aoEntrar(browser.found!.code)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.achado, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="person-circle-outline" size={24} color={COLORS.ink} />
          <Text style={styles.achadoTexto}>
            Está no comboio {browser.found.code} — tocar para entrar
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.inkMuted} />
        </Pressable>
      )}

      <ScrollView style={{ maxHeight: 360 }}>
        {browser.isLoading && <ActivityIndicator color={COLORS.ink} style={{ padding: ESPACO.lg }} />}
        {!browser.isLoading && browser.convoys.length === 0 && (
          <EstadoVazio icone="radio-outline" texto="Nenhum comboio ativo no momento." />
        )}
        {browser.convoys.map((c) => (
          <View key={c.code} style={styles.comboio}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.codigo}>{c.code}</Text>
              <Text style={TIPO.apoio}>
                {c.riders} de {CONVOY_CAPACITY}
                {c.total > c.riders ? ` · ${c.total - c.riders} de apoio` : ''}
                {c.isFull ? ' · lotado' : ''}
              </Text>
            </View>
            {c.code === codigoAtual ? (
              <View style={styles.aqui}>
                <Ionicons name="location" size={14} color={COLORS.brandText} />
                <Text style={styles.aquiTexto}>você está aqui</Text>
              </View>
            ) : (
              <Botao rotulo="Entrar" compacto onPress={() => aoEntrar(c.code)} />
            )}
          </View>
        ))}
      </ScrollView>
    </Folha>
  );
};

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', gap: ESPACO.sm, alignItems: 'center' },
  achado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    minHeight: ALVO.botao,
    paddingHorizontal: ESPACO.md,
    borderRadius: RAIO.md,
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    backgroundColor: COLORS.elevated,
  },
  achadoTexto: { color: COLORS.ink, fontSize: 15, fontWeight: '700', flex: 1 },
  comboio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    minHeight: 64,
    paddingVertical: ESPACO.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  codigo: { color: COLORS.ink, fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  aqui: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.xs },
  aquiTexto: { color: COLORS.brandText, fontSize: 13, fontWeight: '700' },
});
