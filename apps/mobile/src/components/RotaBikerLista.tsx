import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  MONUMENTOS_ROTA_BIKER, AVISO_ROTA_BIKER, SITE_ROTA_BIKER, buscarMonumentos, linkMapaMonumento, linkInstagramMonumento,
  type GeoPoint, type MonumentoRotaBiker,
} from '@motorede/shared';
import { Ajuda, Campo, Cartao } from './ui/Cartao';
import { Botao } from './ui/Botao';
import { COLORS, ESPACO, RAIO, TIPO } from '../theme';

type Item = ReturnType<typeof buscarMonumentos>[number];

/** Card de um ponto de carimbo; também usado nos detalhes da rota. */
export function CartaoMonumento({ monumento: m, distanciaKm = null, abrir }: {
  monumento: MonumentoRotaBiker; distanciaKm?: number | null; abrir: (url: string) => void;
}) {
  const instagram = linkInstagramMonumento(m);
  return <Cartao>
    <View style={styles.linha}>
      <View style={styles.selo}><Ionicons name="ribbon-outline" size={24} color={COLORS.brandText} /></View>
      <Text style={[TIPO.rotulo, { flex: 1 }]}>MONUMENTO Nº {m.numero}</Text>
      {m.situacao === 'em_construcao' && <Text style={TIPO.apoio}>Em construção</Text>}
    </View>
    <Text style={TIPO.tituloCard}>{m.nome}</Text>
    <Ajuda>{m.cidade} · {m.uf}{m.pais !== 'Brasil' ? ` · ${m.pais}` : ''}</Ajuda>
    {distanciaKm !== null && <Ajuda>Cidade a {distanciaKm.toFixed(0)} km em linha reta</Ajuda>}
    <View style={styles.linha}>
      <Botao flex compacto rotulo="Como chegar" icone="navigate-outline" onPress={() => abrir(linkMapaMonumento(m))} />
      {instagram && <Botao flex compacto rotulo="Instagram" icone="open-outline" onPress={() => abrir(instagram)} />}
    </View>
  </Cartao>;
}

export function RotaBikerLista({ cabecalho, origem, localizando, localizar, abrir }: {
  cabecalho: React.ReactElement; origem: GeoPoint | null; localizando: boolean;
  localizar: () => void; abrir: (url: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const [pertoDeMim, setPertoDeMim] = useState(false);
  const ordem = pertoDeMim && origem ? 'proximidade' : 'numero';
  const resultados = useMemo(() => buscarMonumentos(MONUMENTOS_ROTA_BIKER, { busca, origem, ordem }), [busca, origem, ordem]);
  const carimbando = MONUMENTOS_ROTA_BIKER.filter(m => m.situacao === 'carimbando').length;
  return <FlatList<Item> data={resultados} keyExtractor={({ monumento }) => String(monumento.numero)} keyboardShouldPersistTaps="handled"
    contentContainerStyle={styles.lista} initialNumToRender={6} maxToRenderPerBatch={8} windowSize={5}
    ItemSeparatorComponent={<View style={{ height: ESPACO.md }} />}
    ListHeaderComponent={<View style={styles.cabecalho}>
      {cabecalho}
      <Ajuda>Pontos com o Monumento ao Cumprimento Biker, onde se carimba o passaporte da Rota Biker. {carimbando} carimbando e {MONUMENTOS_ROTA_BIKER.length - carimbando} em construção.</Ajuda>
      <Ajuda>{AVISO_ROTA_BIKER}</Ajuda>
      <Botao rotulo="Site oficial da Rota Biker" icone="open-outline" onPress={() => abrir(SITE_ROTA_BIKER)} />
      <Campo accessibilityLabel="Buscar monumento por nome, número, cidade ou estado" value={busca} onChangeText={setBusca} placeholder="Busque um monumento ou cidade" returnKeyType="search" />
      <Botao compacto rotulo="Perto de mim" icone="locate-outline" carregando={localizando} variante={ordem === 'proximidade' ? 'action' : 'secundario'}
        onPress={() => { setPertoDeMim(!pertoDeMim); if (!origem) localizar(); }} />
      <Text style={TIPO.tituloCard} accessibilityLiveRegion="polite">{resultados.length} {resultados.length === 1 ? 'ponto de carimbo' : 'pontos de carimbo'}</Text>
    </View>}
    ListEmptyComponent={<Ajuda>Nenhum monumento encontrado. Experimente outra cidade.</Ajuda>}
    renderItem={({ item }) => <CartaoMonumento monumento={item.monumento} distanciaKm={item.distanciaKm} abrir={abrir} />}
  />;
}

const styles = StyleSheet.create({
  lista: { padding: ESPACO.lg, paddingBottom: ESPACO.xxl },
  cabecalho: { gap: ESPACO.lg, paddingBottom: ESPACO.lg },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md },
  selo: { backgroundColor: COLORS.elevated, padding: ESPACO.md, borderRadius: RAIO.md },
});
