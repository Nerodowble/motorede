import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { nomeDaMoto, type Motorcycle } from '@motorede/shared';
import { Botao, BotaoIcone } from '../ui/Botao';
import { Cartao, Rotulo } from '../ui/Cartao';
import { Folha } from '../ui/Folha';
import { FormMoto } from './FormMoto';
import { COLORS, ESPACO } from '../../theme';

/**
 * Garagem: as motos do piloto, a que está em uso marcada.
 *
 * Tocar numa moto passa a usá-la; o lápis corrige marca, modelo, ano, km e
 * placa; a lixeira apaga a moto com o histórico dela — com confirmação, porque
 * não tem volta.
 */
export const GaragemMotos: React.FC<{
  motos: Motorcycle[];
  ativaId: string | null;
  aoEscolher: (id: string) => void;
  aoSalvar: (moto: Motorcycle) => void;
  aoApagar: (id: string) => void;
}> = ({ motos, ativaId, aoEscolher, aoSalvar, aoApagar }) => {
  // 'nova' cadastra; uma moto edita; null fecha.
  const [folha, setFolha] = useState<Motorcycle | 'nova' | null>(null);

  const confirmarApagar = (m: Motorcycle) => {
    Alert.alert(
      `Apagar ${nomeDaMoto(m)}?`,
      'A moto sai da garagem junto com o histórico de trocas e a capa dela. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: () => aoApagar(m.id) },
      ]
    );
  };

  return (
    <Cartao>
      <Rotulo icone="albums-outline">GARAGEM · {motos.length}</Rotulo>
      {motos.map((m) => {
        const ativa = m.id === ativaId;
        return (
          <View key={m.id} style={styles.linha}>
            <Pressable
              style={styles.nome}
              onPress={() => aoEscolher(m.id)}
              disabled={ativa}
              accessibilityRole="button"
              accessibilityState={{ selected: ativa }}
              accessibilityLabel={ativa ? `${nomeDaMoto(m)}, em uso` : `Usar ${nomeDaMoto(m)}`}
            >
              <Ionicons
                name={ativa ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={ativa ? COLORS.action : COLORS.inkMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo} numberOfLines={1}>{nomeDaMoto(m)}</Text>
                <Text style={styles.apoio}>
                  {m.year} · {m.currentKm.toLocaleString('pt-BR')} km{ativa ? ' · em uso' : ''}
                </Text>
              </View>
            </Pressable>
            <BotaoIcone icone="pencil" rotulo={`Editar ${nomeDaMoto(m)}`} onPress={() => setFolha(m)} />
            <BotaoIcone
              icone="trash-outline"
              cor={COLORS.dangerText}
              rotulo={`Apagar ${nomeDaMoto(m)}`}
              onPress={() => confirmarApagar(m)}
            />
          </View>
        );
      })}
      <Botao rotulo="Adicionar outra moto" icone="add" onPress={() => setFolha('nova')} />

      <Folha
        visivel={folha !== null}
        aoFechar={() => setFolha(null)}
        titulo={folha === 'nova' ? 'Nova moto' : 'Editar moto'}
      >
        {folha !== null && (
          <FormMoto
            key={folha === 'nova' ? 'nova' : folha.id}
            moto={folha === 'nova' ? undefined : folha}
            aoSalvar={(m) => {
              aoSalvar(m);
              setFolha(null);
            }}
            aoCancelar={() => setFolha(null)}
          />
        )}
      </Folha>
    </Cartao>
  );
};

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    minHeight: 60,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  nome: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, paddingVertical: ESPACO.sm },
  titulo: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  apoio: { color: COLORS.inkMuted, fontSize: 13 },
});
