import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CATALOGO_ROTAS, AVISO_CATALOGO_ROTAS, AVISO_CUSTO_ROTAS, AVISO_NAVEGACAO_ROTAS,
  ROTULOS_PAVIMENTO, ROTULOS_CURVAS, buscarRotas, estimarCustoRota,
  lerNumeroRota, formatarReaisRota, linksNavegacaoRota, fonteRotaSegura,
  type Motorcycle, type GeoPoint, type PavimentoRota, type CurvasRota,
} from '@motorede/shared';
import { Ajuda, Campo, Cartao, Rotulo, TituloCartao, TituloTela, estilosBase } from '../components/ui/Cartao';
import { Botao } from '../components/ui/Botao';
import { ALVO, COLORS, ESPACO, RAIO, TIPO } from '../theme';

function Numero({ rotulo, valor, mudar, placeholder }: {
  rotulo: string; valor: string; mudar: (v: string) => void; placeholder?: string;
}) {
  return <View style={styles.campo}>
    <Text style={TIPO.apoio}>{rotulo}</Text>
    <Campo accessibilityLabel={rotulo} keyboardType="decimal-pad" value={valor} onChangeText={mudar} placeholder={placeholder} />
  </View>;
}
function Opcoes({ rotulo, valor, mudar, opcoes }: {
  rotulo: string; valor: string; mudar: (v: string) => void; opcoes: Record<string, string>;
}) {
  return <View style={styles.campo}>
    <Text style={TIPO.apoio}>{rotulo}</Text>
    <View style={styles.opcoes}>
      {Object.entries({ '': 'Qualquer', ...opcoes }).map(([v, nome]) => <Pressable key={v} onPress={() => mudar(v)}
        accessibilityRole="radio" accessibilityLabel={`${rotulo}: ${nome}`} accessibilityState={{ checked: v === valor }}
        style={[styles.opcao, valor === v && styles.opcaoAtiva]}>
        <Text style={[styles.opcaoTexto, valor === v && { color: COLORS.onAction }]}>{nome}</Text>
      </Pressable>)}
    </View>
  </View>;
}

export function RoutesScreen({ motorcycle }: { motorcycle: Motorcycle | null }) {
  const [busca, setBusca] = useState('');
  const [pavimento, setPavimento] = useState<PavimentoRota | ''>('');
  const [curvas, setCurvas] = useState<CurvasRota | ''>('');
  const [consumo, setConsumo] = useState(() => motorcycle?.avgConsumptionKmL?.toString() ?? '');
  const [preco, setPreco] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [autonomia, setAutonomia] = useState('');
  const [idaVolta, setIdaVolta] = useState(false);
  const [planejamento, setPlanejamento] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [origem, setOrigem] = useState<GeoPoint | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [erro, setErro] = useState('');
  const resultados = buscarRotas(CATALOGO_ROTAS, { busca, pavimento, curvas, origem });
  const calculoValido = lerNumeroRota(consumo) !== null && lerNumeroRota(preco) !== null;
  const invalido = [consumo, preco, orcamento, autonomia].some((v) => v.trim() !== '' && lerNumeroRota(v) === null);

  const localizar = async () => {
    setLocalizando(true);
    setErro('');
    try {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (permissao.status !== 'granted') throw new Error('Permita a localização para ordenar por proximidade.');
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // A posição fica nesta tela: consultar rotas não anuncia presença no SOS.
      setOrigem({ lat: p.coords.latitude, lng: p.coords.longitude });
    } catch (e) {
      setOrigem(null);
      setErro(e instanceof Error && e.message.startsWith('Permita') ? e.message : 'Não foi possível obter sua posição. Você pode continuar buscando por nome.');
    } finally { setLocalizando(false); }
  };
  const abrir = async (url: string) => {
    setErro('');
    try { await Linking.openURL(url); }
    catch { setErro('Não foi possível abrir o link. Confira se há um navegador disponível.'); }
  };

  return <ScrollView contentContainerStyle={estilosBase.conteudo} keyboardShouldPersistTaps="handled">
    <TituloTela sobrelinha="PLANEJE SUA PRÓXIMA SAÍDA" titulo="Rotas" descricao="Encontre um roteiro, estime os gastos e siga com seu navegador." />
    <Ajuda>{AVISO_CATALOGO_ROTAS}</Ajuda>
    <Cartao>
      <Rotulo icone="search-outline">Nome, cidade ou estado</Rotulo>
      <Campo accessibilityLabel="Buscar rota por nome, cidade ou estado" value={busca} onChangeText={setBusca} placeholder="Ex.: serra, Paraty, SP" />
      <Botao rotulo={planejamento ? 'Recolher filtros e planejamento' : 'Filtros e planejamento'} icone="options-outline" onPress={() => setPlanejamento(!planejamento)} />
      {planejamento && <>
        <Opcoes rotulo="Pavimento" valor={pavimento} mudar={(v) => setPavimento(v as PavimentoRota | '')} opcoes={ROTULOS_PAVIMENTO} />
        <Opcoes rotulo="Curvas" valor={curvas} mudar={(v) => setCurvas(v as CurvasRota | '')} opcoes={ROTULOS_CURVAS} />
        <Numero rotulo="Consumo da moto (km/l)" valor={consumo} mudar={setConsumo} placeholder="Informe sua média" />
        <Numero rotulo="Preço do combustível (R$/l)" valor={preco} mudar={setPreco} placeholder="Informe o preço local" />
        <View style={styles.linha}>
          <Text style={[TIPO.corpo, { flex: 1 }]}>Ida e volta pelo mesmo trecho</Text>
          <Switch accessibilityLabel="Calcular ida e volta pelo mesmo trecho" value={idaVolta} onValueChange={setIdaVolta} trackColor={{ false: COLORS.lineStrong, true: COLORS.inkMuted }} thumbColor={COLORS.ink} />
        </View>
        <Numero rotulo="Orçamento do trecho (R$, opcional)" valor={orcamento} mudar={setOrcamento} placeholder="Sem limite" />
        <Numero rotulo="Autonomia planejada (km, opcional)" valor={autonomia} mudar={setAutonomia} placeholder="Sem avaliação" />
        <Botao rotulo="Limpar busca e filtros" variante="fantasma" onPress={() => { setBusca(''); setPavimento(''); setCurvas(''); }} />
      </>}
      {invalido && <Text style={estilosBase.erro} accessibilityRole="alert">Use valores maiores que zero, com vírgula ou ponto decimal.</Text>}
      {!calculoValido && <Ajuda>Abra Filtros e planejamento e informe consumo e preço para calcular os gastos.</Ajuda>}
      <Ajuda>{AVISO_CUSTO_ROTAS}</Ajuda>
      <Botao rotulo="Ordenar por proximidade" icone="locate-outline" carregando={localizando} onPress={() => void localizar()} />
      {erro !== '' && <Text style={estilosBase.erro} accessibilityRole="alert">{erro}</Text>}
    </Cartao>
    <Text style={TIPO.apoio} accessibilityLiveRegion="polite">{resultados.length} rota(s) · {origem ? 'por proximidade ao início, em linha reta' : 'por nome'}</Text>
    {resultados.length === 0 && <Cartao><Ajuda>Nenhuma rota corresponde à busca. Experimente outros filtros.</Ajuda><Botao rotulo="Limpar busca e filtros" onPress={() => { setBusca(''); setPavimento(''); setCurvas(''); }} /></Cartao>}
    {resultados.map(({ rota, distanciaInicioKm }) => {
      const custo = estimarCustoRota(rota, lerNumeroRota(consumo), lerNumeroRota(preco), idaVolta, lerNumeroRota(orcamento), lerNumeroRota(autonomia));
      const links = linksNavegacaoRota(rota);
      const expandida = aberta === rota.id;
      return <Cartao key={rota.id}>
        <Text style={TIPO.rotulo}>{rota.regiao}</Text>
        <Text style={TIPO.tituloCard}>{rota.nome}</Text>
        <Ajuda>{rota.inicio.cidade} → {rota.fim.cidade}</Ajuda>
        <Ajuda>{rota.distanciaKm} km de ida · {ROTULOS_PAVIMENTO[rota.pavimento]} · {ROTULOS_CURVAS[rota.curvas]}</Ajuda>
        {distanciaInicioKm !== null && <Ajuda>Início a {distanciaInicioKm.toFixed(1)} km em linha reta</Ajuda>}
        <View style={styles.custo}>
          <Text style={TIPO.rotulo}>ESTIMATIVA · {idaVolta ? 'IDA E VOLTA' : 'IDA'} · {custo.distancia} KM</Text>
          <Text style={TIPO.titulo}>{formatarReaisRota(custo.total)}</Text>
          <Ajuda>Combustível: {formatarReaisRota(custo.combustivel)}</Ajuda>
          <Ajuda>Pedágios do catálogo: {custo.pedagios === null ? 'não informados' : formatarReaisRota(custo.pedagios)}</Ajuda>
        </View>
        {custo.acimaOrcamento && <Text style={estilosBase.erro}>Acima do orçamento informado para o trecho.</Text>}
        {custo.alertaAutonomia && <Text style={estilosBase.erro}>O trecho sem posto do catálogo supera sua autonomia planejada.</Text>}
        <Ajuda>Revisão informada na origem: {rota.revisao ?? 'sem data'} · Não revisada pelo MotoRede</Ajuda>
        <Pressable onPress={() => setAberta(expandida ? null : rota.id)} accessibilityRole="button" accessibilityState={{ expanded: expandida }} style={styles.detalhes}>
          <Text style={[TIPO.corpo, { flex: 1, fontWeight: '700' }]}>{expandida ? 'Ocultar detalhes' : 'Ver detalhes e navegação'}</Text>
          <Ionicons name={expandida ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.inkMuted} />
        </Pressable>
        {expandida && <>
          <View style={estilosBase.divisoria} />
          {rota.descricao && <Ajuda>{rota.descricao}</Ajuda>}
          {rota.dificuldade && <Ajuda>Dificuldade do catálogo: {rota.dificuldade}</Ajuda>}
          {rota.melhorEpoca && <Ajuda>Época sugerida no catálogo: {rota.melhorEpoca}</Ajuda>}
          <Ajuda>Trecho sem posto informado: {rota.trechoSemPostoKm} km. Confirme a disponibilidade de abastecimento.</Ajuda>
          <TituloCartao icone="receipt-outline">Pedágios de moto · uma passagem</TituloCartao>
          {rota.pedagios?.length ? rota.pedagios.map((p, i) => <View key={`${p.nome}-${i}`} style={styles.campo}>
            <Text style={TIPO.corpo}>{p.nome} · {formatarReaisRota(p.valorMoto)}</Text>
            <Ajuda>{p.sistema === 'free_flow' ? 'Cobrança automática (free flow)' : 'Praça física'}</Ajuda>
            {p.fonte && fonteRotaSegura(p.fonte) && <Botao rotulo="Consultar fonte da tarifa" icone="open-outline" onPress={() => void abrir(p.fonte!)} />}
          </View>) : <Ajuda>{rota.pedagioIda === 0 ? 'Nenhum pedágio cadastrado na origem; confirme a situação atual.' : 'Praças não detalhadas no catálogo.'}</Ajuda>}
          <TituloCartao icone="flag-outline">Pontos de apoio do catálogo</TituloCartao>
          {rota.pontosApoio.map((p, i) => <View key={`${p.nome}-${i}`} style={styles.ponto}>
            <Text style={[TIPO.corpo, { fontWeight: '700' }]}>{p.nome}</Text><Ajuda>{p.descricao}</Ajuda>
          </View>)}
          {rota.pontosApoio.length === 0 && <Ajuda>Nenhum ponto cadastrado.</Ajuda>}
          {rota.observacoes.length > 0 && <><TituloCartao>Observações da origem · não verificadas</TituloCartao>{rota.observacoes.map((o, i) => <Ajuda key={i}>• {o}</Ajuda>)}</>}
          <TituloCartao icone="navigate-outline">Navegação</TituloCartao>
          <Ajuda>{AVISO_NAVEGACAO_ROTAS}</Ajuda>
          <Botao rotulo="Ir ao início · Google Maps" icone="navigate-outline" variante="action" onPress={() => void abrir(links.googleInicio)} />
          <Botao rotulo="Ir ao início · Waze" icone="open-outline" onPress={() => void abrir(links.wazeInicio)} />
          <Botao rotulo="Ver início → fim · Google Maps" icone="open-outline" onPress={() => void abrir(links.googleTrecho)} />
          {rota.fontes.filter(fonteRotaSegura).length > 0 && <><TituloCartao>Fontes informadas no BikerWay</TituloCartao>{rota.fontes.filter(fonteRotaSegura).map((fonte, i) => <Botao key={fonte} rotulo={`Consultar fonte ${i + 1}`} icone="open-outline" onPress={() => void abrir(fonte)} />)}</>}
        </>}
      </Cartao>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  campo: { gap: ESPACO.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  opcao: { minHeight: ALVO.min, borderRadius: RAIO.md, paddingHorizontal: ESPACO.md, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.lineStrong, backgroundColor: COLORS.elevated },
  opcaoAtiva: { backgroundColor: COLORS.action, borderColor: COLORS.action },
  opcaoTexto: { ...TIPO.apoio, fontWeight: '700' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, minHeight: ALVO.min },
  custo: { backgroundColor: COLORS.elevated, padding: ESPACO.lg, borderRadius: RAIO.md, gap: ESPACO.sm },
  detalhes: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, minHeight: ALVO.botao },
  ponto: { borderLeftWidth: 1, borderLeftColor: COLORS.lineStrong, paddingLeft: ESPACO.md, gap: ESPACO.sm },
});
