import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  describeMeasuredHint,
  describeRemaining,
  sortByUrgency,
  type ConsumableCategory,
  type MaintenanceItemStatus,
} from '@motorede/shared';
import { Botao, type NomeIcone } from '../ui/Botao';
import { Ajuda, Cartao, TituloCartao, estilosBase } from '../ui/Cartao';
import { InfoAjuda } from '../InfoAjuda';
import { ALVO, COLORS, ESPACO, RAIO } from '../../theme';

/*
 * Status sem âmbar e sem verde: essas duas cores já querem dizer "falando" e
 * "microfone aberto". O que distingue o status é ícone + palavra + cor da
 * barra, em escala de atenção: vencido (vermelho claro), se aproximando
 * (branco, cheio), em dia (cinza, calmo).
 */
const emKm = (n: number) => `${n.toLocaleString('pt-BR')} km`;

const CORES_STATUS: Record<MaintenanceItemStatus['status'], string> = {
  vencido: COLORS.dangerText,
  'hora-de-trocar': COLORS.dangerText,
  proximo: COLORS.ink,
  ok: COLORS.inkFaint,
  'sem-intervalo': COLORS.inkMuted,
  'sem-registro': COLORS.inkFaint,
};

const ICONES_STATUS: Record<MaintenanceItemStatus['status'], NomeIcone> = {
  vencido: 'alert-circle',
  'hora-de-trocar': 'alert-circle',
  proximo: 'time',
  ok: 'checkmark-circle',
  'sem-intervalo': 'help-circle-outline',
  'sem-registro': 'ellipse-outline',
};

const ROTULOS_STATUS: Record<MaintenanceItemStatus['status'], string> = {
  vencido: 'vencido',
  'hora-de-trocar': 'hora de trocar',
  proximo: 'se aproximando',
  ok: 'em dia',
  'sem-intervalo': 'falta o intervalo',
  'sem-registro': '',
};

/** Cartão do plano de manutenção da tela Minha moto. */
export const PlanoManutencao: React.FC<{
  maintenance: MaintenanceItemStatus[];
  abrirRegistro: (categoria: ConsumableCategory) => void;
  abrirIntervalo: (categoria: ConsumableCategory) => void;
}> = ({ maintenance, abrirRegistro, abrirIntervalo }) => (
  <Cartao>
    <TituloCartao icone="construct-outline">Plano de manutenção</TituloCartao>
    {sortByUrgency(maintenance).map((item, indice) => {
      const cor = CORES_STATUS[item.status];
      const semRegistro = item.status === 'sem-registro';
      const dica = describeMeasuredHint(item);
      const progresso =
        item.intervalKm && item.kmSinceLast !== undefined
          ? Math.min(100, Math.round((item.kmSinceLast / item.intervalKm) * 100))
          : 0;

      return (
        <View key={item.category} style={styles.itemManutencao}>
          {indice > 0 && <View style={estilosBase.divisoria} />}
          <View style={styles.topoManutencao}>
            <View style={{ flex: 1, gap: ESPACO.xs }}>
              <Text style={styles.nomeManutencao}>{item.label}</Text>
              <View style={[styles.status, (item.status === 'vencido' || item.status === 'hora-de-trocar') && styles.statusVencido]}>
                <Ionicons name={ICONES_STATUS[item.status]} size={16} color={cor} />
                <Text style={[styles.statusTexto, { color: cor }]}>
                  {ROTULOS_STATUS[item.status] || 'sem registro'}
                </Text>
                {!semRegistro && <InfoAjuda chave="situacao" />}
              </View>
            </View>
            <Botao
              rotulo={semRegistro ? 'Registrar' : 'Registrar troca'}
              icone="add"
              compacto
              altura={ALVO.min}
              onPress={() => abrirRegistro(item.category)}
              accessibilityLabel={
                semRegistro
                  ? `Registrar primeira troca: ${item.label}`
                  : `Registrar troca: ${item.label}`
              }
            />
          </View>

          {semRegistro ? (
            <Ajuda>
              Adicione a primeira troca para acompanhar.
              {item.intervalKm !== undefined && ` Você troca a cada ${emKm(item.intervalKm)}.`}
            </Ajuda>
          ) : item.nextChangeKm !== undefined ? (
            <>
              <View style={styles.linhaInfo}>
                <Text style={[styles.frase, { flexShrink: 1 }]}>
                  Próxima troca: {emKm(item.nextChangeKm)}
                </Text>
                <InfoAjuda chave="rodouFaltam" />
              </View>
              <Text style={[styles.fraseResto, { color: item.status === 'ok' ? COLORS.inkMuted : cor }]}>
                {describeRemaining(item.kmRemaining!)}
              </Text>
              <View style={styles.trilha}>
                <View style={[styles.barra, { width: `${progresso}%`, backgroundColor: cor }]} />
              </View>
              <Text style={styles.detalhe}>
                Trocado com {emKm(item.last!.km)} em {new Date(item.last!.date).toLocaleDateString('pt-BR')}
                {item.last!.product ? ` · ${item.last!.product}` : ''}
              </Text>
              <Text style={styles.origem}>
                Você troca a cada {emKm(item.intervalKm!)} · rodou {emKm(item.kmSinceLast!)} desde a troca
              </Text>
              {dica && <Text style={styles.origem}>{dica}</Text>}
            </>
          ) : (
            <>
              <View style={styles.linhaInfo}>
                <Text style={[styles.frase, { flexShrink: 1 }]}>
                  Rodou {emKm(item.kmSinceLast!)} desde a troca
                </Text>
                <InfoAjuda chave="rodouFaltam" />
              </View>
              <Ajuda>
                Trocado com {emKm(item.last!.km)} em {new Date(item.last!.date).toLocaleDateString('pt-BR')}.
                Para saber a próxima troca, diga de quantos em quantos km você troca.
              </Ajuda>
              {dica && <Text style={styles.origem}>{dica}</Text>}
            </>
          )}

          <Botao
            rotulo={
              item.intervalKm !== undefined
                ? 'Mudar a cada quantos km troco'
                : 'Informar a cada quantos km troco'
            }
            icone="pencil"
            variante="fantasma"
            compacto
            style={styles.botaoIntervalo}
            onPress={() => abrirIntervalo(item.category)}
          />
        </View>
      );
    })}
  </Cartao>
);

const styles = StyleSheet.create({
  linhaInfo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  botaoIntervalo: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  itemManutencao: { gap: ESPACO.md, paddingTop: ESPACO.md },
  topoManutencao: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
  nomeManutencao: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: ESPACO.xs },
  statusVencido: {
    paddingHorizontal: ESPACO.sm,
    paddingVertical: ESPACO.xs,
    borderRadius: RAIO.pill,
    backgroundColor: COLORS.sosTint,
  },
  statusTexto: { fontSize: 13, fontWeight: '800' },
  trilha: {
    height: 8,
    borderRadius: RAIO.pill,
    backgroundColor: COLORS.elevated,
    overflow: 'hidden',
  },
  barra: { height: '100%', borderRadius: RAIO.pill },
  frase: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  fraseResto: { fontWeight: '600' },
  detalhe: { color: COLORS.inkMuted, fontSize: 13 },
  origem: { color: COLORS.inkMuted, fontSize: 13 },
});
