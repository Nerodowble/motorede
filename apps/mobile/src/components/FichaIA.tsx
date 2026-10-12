import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  AVISO_FICHA_IA,
  linhasFichaMoto,
  rotuloUsoFicha,
  type ConsumableCategory,
  type Motorcycle,
  type UsoFicha,
} from '@motorede/shared';
import { useFichaMoto } from '../hooks/useFichaMoto';
import { Botao } from './ui/Botao';
import { Ajuda, Cartao, TituloCartao } from './ui/Cartao';
import { COLORS, ESPACO } from '../theme';

/**
 * Ficha do modelo pesquisada por IA, na tela Minha moto — a mesma da web
 * (apps/web/src/components/FichaIA.tsx), adaptada ao app.
 *
 * A pesquisa só começa no toque em "Ver ficha": a primeira pessoa com o modelo
 * espera a IA; as seguintes recebem do cache. Nada vai para a moto sem o
 * piloto tocar em "usar", e a tela diz sempre de onde o dado veio — inclusive
 * quando a IA está fora do ar.
 */

export const FichaIA: React.FC<{
  motorcycle: Motorcycle;
  onSetInterval: (category: ConsumableCategory, km: number | null) => void;
  onSaveMotorcycle: (moto: Motorcycle) => void;
}> = ({ motorcycle, onSetInterval, onSaveMotorcycle }) => {
  const [aberto, setAberto] = useState(false);
  const { situacao, pesquisar } = useFichaMoto(motorcycle.brand, motorcycle.model, motorcycle.year);

  const usar = (uso: UsoFicha) => {
    if (uso.tipo === 'intervalo') onSetInterval(uso.categoria, uso.km);
    else onSaveMotorcycle({ ...motorcycle, [uso.campo]: uso.valor });
  };

  const tentarDeNovo = <Botao rotulo="Tentar de novo" icone="refresh" compacto onPress={() => void pesquisar()} />;

  let corpo: React.ReactNode = null;
  if (!aberto) {
    corpo = (
      <>
        <Ajuda>Tanque, óleo e intervalos do manual do seu modelo, pesquisados por IA.</Ajuda>
        <Botao
          rotulo="Ver ficha"
          icone="sparkles-outline"
          onPress={() => {
            setAberto(true);
            if (situacao.estado === 'ocioso') void pesquisar();
          }}
        />
      </>
    );
  } else {
    switch (situacao.estado) {
      case 'ocioso':
      case 'pendente':
        corpo = (
          <View style={styles.linha}>
            <ActivityIndicator size="small" color={COLORS.inkMuted} />
            <Ajuda>
              Pesquisando {motorcycle.brand} {motorcycle.model} {motorcycle.year}… pode levar até 1 minuto.
            </Ajuda>
          </View>
        );
        break;
      case 'indisponivel':
        corpo = (
          <>
            <Ajuda>A pesquisa por IA está fora do ar agora. Os dados que você preencheu continuam valendo.</Ajuda>
            {tentarDeNovo}
          </>
        );
        break;
      case 'sem-dados':
        corpo = <Ajuda>A IA não encontrou dados confiáveis para este modelo.</Ajuda>;
        break;
      case 'falhou':
      case 'demorou':
      case 'erro':
        corpo = (
          <>
            <Ajuda>
              {situacao.estado === 'erro'
                ? situacao.mensagem
                : situacao.estado === 'demorou'
                  ? 'A IA está demorando. Tente de novo daqui a pouco.'
                  : 'A IA não conseguiu responder agora. Tente de novo em alguns minutos.'}
            </Ajuda>
            {tentarDeNovo}
          </>
        );
        break;
      case 'pronta':
        corpo = (
          <>
            {linhasFichaMoto(situacao.ficha, motorcycle).map((l) => (
              <View key={l.rotulo} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rotulo}>{l.rotulo}</Text>
                  <Text style={styles.valor}>{l.valor}</Text>
                  {l.nota && <Text style={styles.nota}>{l.nota}</Text>}
                </View>
                {l.usar && <Botao rotulo={rotuloUsoFicha(l.usar)} compacto onPress={() => usar(l.usar!)} />}
              </View>
            ))}
            {situacao.ficha.observacao && <Ajuda>“{situacao.ficha.observacao}”</Ajuda>}
            <Text style={styles.nota}>
              {AVISO_FICHA_IA} Pesquisado em {new Date(situacao.em).toLocaleDateString('pt-BR')}.
            </Text>
          </>
        );
        break;
    }
  }

  return (
    <Cartao>
      <TituloCartao icone="sparkles-outline">Ficha do modelo · pesquisada por IA</TituloCartao>
      {corpo}
    </Cartao>
  );
};

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    paddingTop: ESPACO.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  rotulo: { color: COLORS.inkMuted, fontSize: 13 },
  valor: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  nota: { color: COLORS.inkMuted, fontSize: 12, lineHeight: 17 },
});
