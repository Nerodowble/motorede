import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatarReaisRota, type Motorcycle } from '@motorede/shared';
import { Ajuda, Campo, Cartao, TituloCartao, estilosBase } from './ui/Cartao';
import { Botao } from './ui/Botao';
import { usePlanoViagem } from '../hooks/usePlanoViagem';
import { ALVO, COLORS, ESPACO, RAIO, TIPO } from '../theme';

const kmTxt = (n: number) => `${Math.round(n).toLocaleString('pt-BR')} km`;
const horas = (h: number) => { const t = Math.round(h * 60); return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')} min`; };

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return <View style={styles.linha}>
    <Text style={[TIPO.corpo, { flex: 1, color: COLORS.inkMuted }]}>{rotulo}</Text>
    <Text style={[TIPO.corpo, forte && { fontWeight: '800' }]}>{valor}</Text>
  </View>;
}

/** Aba "Viagem" de Rotas: daqui até um destino, com custo, paradas, pedágios e óleo. */
export function PlanejarViagem({ cabecalho, moto, proximaTrocaOleoKm }: {
  cabecalho: React.ReactElement; moto: Motorcycle | null; proximaTrocaOleoKm: number | null;
}) {
  const v = usePlanoViagem(moto, proximaTrocaOleoKm);
  const r = v.resultado;
  const abrir = (url: string) => void Linking.openURL(url).catch(() => undefined);

  return <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
    {cabecalho}

    <Cartao>
      <TituloCartao icone="navigate-outline">Para onde?</TituloCartao>
      <Campo accessibilityLabel="Destino da viagem" value={v.busca} onChangeText={v.setBusca}
        placeholder="Cidade, serra, ponto turístico…" returnKeyType="search" autoCorrect={false} />
      {v.sugestoes.map((l) => <Pressable key={`${l.nome}${l.detalhe}${l.lat}`} accessibilityRole="button" onPress={() => v.escolher(l)} style={styles.sugestao}>
        <Ionicons name="location-outline" size={20} color={COLORS.inkMuted} />
        <View style={{ flex: 1 }}>
          <Text style={TIPO.corpo}>{l.nome}</Text>
          {!!l.detalhe && <Text style={TIPO.apoio}>{l.detalhe}</Text>}
        </View>
      </Pressable>)}
      <Ajuda>Saindo da sua localização de agora.</Ajuda>
    </Cartao>

    <Cartao>
      <TituloCartao icone="speedometer-outline">Moto e combustível</TituloCartao>
      <View style={styles.campos}>
        <View style={styles.campo}><Text style={TIPO.apoio}>Consumo (km/l)</Text>
          <Campo value={v.consumo} onChangeText={v.setConsumo} keyboardType="decimal-pad" placeholder="Ex.: 20" accessibilityLabel="Consumo em quilômetros por litro" /></View>
        <View style={styles.campo}><Text style={TIPO.apoio}>Tanque (litros)</Text>
          <Campo value={v.tanque} onChangeText={v.setTanque} keyboardType="decimal-pad" placeholder="Ex.: 14" accessibilityLabel="Capacidade do tanque em litros" /></View>
        <View style={styles.campo}><Text style={TIPO.apoio}>Gasolina (R$/l)</Text>
          <Campo value={v.preco} onChangeText={v.setPreco} keyboardType="decimal-pad" placeholder="Ex.: 6,29" accessibilityLabel="Preço médio do litro em reais" /></View>
      </View>
      <Ajuda>{v.autonomia ? `Autonomia de ${kmTxt(v.autonomia)} com o tanque cheio. Paradas sugeridas quando restar uns 25%.` : 'Com consumo e tanque, o app sugere onde abastecer.'}</Ajuda>
      <View style={styles.linhaBotoes}>
        <Botao flex compacto rotulo="Só ida" variante={v.idaVolta ? 'secundario' : 'action'} onPress={() => v.setIdaVolta(false)} />
        <Botao flex compacto rotulo="Ida e volta" variante={v.idaVolta ? 'action' : 'secundario'} onPress={() => v.setIdaVolta(true)} />
      </View>
    </Cartao>

    <Botao rotulo="Calcular viagem" icone="calculator-outline" variante="action" carregando={v.calculando}
      disabled={!v.destino} onPress={() => void v.calcular()} />
    {v.erro !== '' && <Text style={estilosBase.erro} accessibilityRole="alert">{v.erro}</Text>}

    {r && <>
      <Cartao>
        <TituloCartao icone="map-outline">{v.destino?.nome}</TituloCartao>
        <Linha rotulo={v.idaVolta ? 'Distância (ida e volta)' : 'Distância'} valor={kmTxt(r.custo.distanciaKm)} />
        <Linha rotulo="Tempo de estrada (ida, sem paradas)" valor={horas(r.rota.duracaoH)} />
        <Linha rotulo="Gasolina" valor={r.custo.litros === null ? 'Informe o consumo' : `${r.custo.litros.toLocaleString('pt-BR')} l`} />
        <Linha rotulo="Combustível" valor={r.custo.combustivel === null ? 'Informe consumo e preço' : formatarReaisRota(r.custo.combustivel)} />
        <Linha rotulo="Pedágios conhecidos" valor={r.resumo ? formatarReaisRota(r.custo.pedagios) : 'Tabela indisponível'} />
        <View style={estilosBase.divisoria} />
        <Linha rotulo="Total estimado" valor={r.custo.total === null ? '—' : formatarReaisRota(r.custo.total)} forte />
        {v.idaVolta && <Ajuda>A volta é estimada igual à ida.</Ajuda>}
      </Cartao>

      {r.oleo && <Cartao destaque={r.oleo.situacao === 'depois' ? undefined : COLORS.dangerText}>
        <TituloCartao icone="water-outline">Troca de óleo</TituloCartao>
        <Ajuda>{r.oleo.situacao === 'vencida' ? `A troca já passou ${kmTxt(r.oleo.passouKm)}. Troque antes de sair.`
          : r.oleo.situacao === 'na-viagem' ? `A troca vence no km ${r.oleo.kmDaViagem.toLocaleString('pt-BR')} da viagem. Melhor trocar antes de sair.`
          : `A troca fica para depois: sobram ${kmTxt(r.oleo.sobraKm)} quando você voltar.`}</Ajuda>
      </Cartao>}

      <Cartao>
        <TituloCartao icone="flash-outline">Paradas para abastecer</TituloCartao>
        {r.rota.paradas.length === 0 && <Ajuda>{v.autonomia ? 'A viagem cabe num tanque. Mesmo assim, saia de tanque cheio.' : 'Informe consumo e tanque para ver as paradas.'}</Ajuda>}
        {r.rota.paradas.map((p, i) => <View key={p.km} style={styles.parada}>
          <Text style={styles.numero}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={TIPO.corpo}>Km {p.km.toLocaleString('pt-BR')}{p.posto ? ` · ${p.posto.nome}` : ''}</Text>
            <Text style={TIPO.apoio}>{p.posto ? (p.posto.distanciaKm <= 0.5 ? 'Na beira da estrada' : `A ${p.posto.distanciaKm.toLocaleString('pt-BR')} km da estrada`) : 'Nenhum posto no mapa por perto: abasteça no anterior.'}</Text>
          </View>
        </View>)}
        <Ajuda>Postos do OpenStreetMap: confira se estão abertos antes de contar com eles.</Ajuda>
      </Cartao>

      <Cartao>
        <TituloCartao icone="cash-outline">Pedágios no caminho</TituloCartao>
        {!r.pedagios && <Ajuda>Não foi possível carregar a tabela de pedágios agora.</Ajuda>}
        {r.pedagios?.length === 0 && <Ajuda>Nenhuma praça da tabela no trajeto.</Ajuda>}
        {r.pedagios?.map(({ praca, km }) => <View key={praca.id} style={styles.linha}>
          <View style={{ flex: 1 }}>
            <Text style={TIPO.corpo}>{praca.nome}</Text>
            <Text style={TIPO.apoio}>{praca.rodovia ?? ''} · km {Math.round(km).toLocaleString('pt-BR')} da viagem</Text>
          </View>
          <Text style={TIPO.corpo}>{praca.situacaoMoto === 'paga' ? formatarReaisRota(praca.motoReais) : praca.situacaoMoto === 'isenta' ? 'Moto isenta' : 'A confirmar'}</Text>
        </View>)}
        <Ajuda>A tabela de pedágios por enquanto só tem praças de São Paulo. Pedágios de outros estados não entram na conta.</Ajuda>
      </Cartao>

      <Botao rotulo="Abrir no Google Maps" icone="open-outline" variante="action" onPress={() => abrir(r.link)}
        accessibilityLabel="Abrir a viagem no Google Maps, com as paradas para abastecer" />
      <Ajuda>Rota calculada pelo openrouteservice (OpenStreetMap). Valores são estimativas: confira antes de sair.</Ajuda>
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  conteudo: { padding: ESPACO.lg, gap: ESPACO.lg, paddingBottom: ESPACO.xxl },
  sugestao: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, minHeight: ALVO.botao, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  campos: { flexDirection: 'row', gap: ESPACO.md },
  campo: { flex: 1, gap: ESPACO.xs },
  linhaBotoes: { flexDirection: 'row', gap: ESPACO.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, minHeight: 32 },
  parada: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
  numero: { ...TIPO.corpo, fontWeight: '800', width: 32, height: 32, textAlign: 'center', lineHeight: 32, borderRadius: RAIO.md, backgroundColor: COLORS.elevated },
});
