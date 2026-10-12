import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRotasSalvas } from '../hooks/useRotasSalvas';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CATALOGO_ROTAS, AVISO_CATALOGO_ROTAS, AVISO_CUSTO_ROTAS, AVISO_NAVEGACAO_ROTAS,
  ROTULOS_EXTENSAO, TAMANHO_LOTE_ROTAS, ROTULOS_PAVIMENTO, ROTULOS_CURVAS, buscarRotas, estimarCustoRota,
  lerNumeroRota, formatarReaisRota, linksNavegacaoRota, fonteRotaSegura,
  type FiltrosRotas, type Motorcycle, type GeoPoint, type PavimentoRota, type CurvasRota,
} from '@motorede/shared';
import { Ajuda, Campo, Cartao, TituloCartao, TituloTela, estilosBase } from '../components/ui/Cartao';
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


type Escolhas = Pick<FiltrosRotas, 'regiao' | 'extensao' | 'pavimento' | 'curvas'>;
type ItemRota = ReturnType<typeof buscarRotas>[number];
const SEM_FILTROS: Escolhas = { regiao: '', extensao: '', pavimento: '', curvas: '' };
const REGIOES = Object.fromEntries([...new Set(CATALOGO_ROTAS.map(r => r.regiao))].sort().map(r => [r, r]));

export function RoutesScreen({ motorcycle }: { motorcycle: Motorcycle | null }) {
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<Escolhas>(SEM_FILTROS);
  const [rascunho, setRascunho] = useState<Escolhas>(SEM_FILTROS);
  const [filtrando, setFiltrando] = useState(false);
  const [modo, setModo] = useState<'explorar' | 'salvas'>('explorar');
  const [ordem, setOrdem] = useState<NonNullable<FiltrosRotas['ordem']>>('nome');
  const [limite, setLimite] = useState(TAMANHO_LOTE_ROTAS);
  const [aberta, setAberta] = useState<string | null>(null);
  const [origem, setOrigem] = useState<GeoPoint | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [erro, setErro] = useState('');
  const [consumo, setConsumo] = useState(() => motorcycle?.avgConsumptionKmL?.toString() ?? '');
  const [preco, setPreco] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [autonomia, setAutonomia] = useState('');
  const [idaVolta, setIdaVolta] = useState(false);
  const salvas = useRotasSalvas();
  const idsSalvos = useMemo(() => new Set(salvas.ids), [salvas.ids]);
  const totalSalvas = useMemo(() => CATALOGO_ROTAS.filter(r => idsSalvos.has(r.id)).length, [idsSalvos]);
  const lista = useRef<FlatList<ItemRota>>(null);
  const resultados = useMemo(() => buscarRotas(CATALOGO_ROTAS, { ...filtros, busca, ordem, origem })
    .filter(({ rota }) => modo !== 'salvas' || idsSalvos.has(rota.id)), [filtros, busca, ordem, origem, modo, idsSalvos]);
  const quantidadeRascunho = useMemo(() => buscarRotas(CATALOGO_ROTAS, { ...rascunho, busca })
    .filter(({ rota }) => modo !== 'salvas' || idsSalvos.has(rota.id)).length, [rascunho, busca, modo, idsSalvos]);
  const visiveis = useMemo(() => resultados.slice(0, limite), [resultados, limite]);
  useEffect(() => {
    setLimite(TAMANHO_LOTE_ROTAS);
    lista.current?.scrollToOffset({ offset: 0, animated: false });
  }, [busca, filtros, ordem, modo, origem]);
  const ativos = [
    ['regiao', filtros.regiao], ['extensao', filtros.extensao ? ROTULOS_EXTENSAO[filtros.extensao] : ''],
    ['pavimento', filtros.pavimento ? ROTULOS_PAVIMENTO[filtros.pavimento] : ''],
    ['curvas', filtros.curvas ? ROTULOS_CURVAS[filtros.curvas] : ''],
  ].filter(([, valor]) => valor) as [keyof Escolhas, string][];
  const limpar = () => { setBusca(''); setFiltros(SEM_FILTROS); };
  const localizar = async () => {
    if (origem) { setOrdem('proximidade'); return; }
    setLocalizando(true); setErro('');
    try {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (permissao.status !== 'granted') throw new Error('Permita a localização para ordenar por proximidade.');
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // Consultar rotas não anuncia presença na rede SOS.
      setOrigem({ lat: p.coords.latitude, lng: p.coords.longitude }); setOrdem('proximidade');
    } catch (e) {
      setErro(e instanceof Error && e.message.startsWith('Permita') ? e.message : 'Não foi possível obter sua posição. Continue buscando por nome ou região.');
    } finally { setLocalizando(false); }
  };
  const abrir = async (url: string) => {
    setErro('');
    try { await Linking.openURL(url); }
    catch { setErro('Não foi possível abrir o link. Confira se há um navegador disponível.'); }
  };
  const rotaSelecionada = CATALOGO_ROTAS.find(r => r.id === aberta);
  const calculoValido = lerNumeroRota(consumo) !== null && lerNumeroRota(preco) !== null;
  const invalido = [consumo, preco, orcamento, autonomia].some(v => v.trim() !== '' && lerNumeroRota(v) === null);
  const renderDetalhe = () => {
    const rota = rotaSelecionada;
    if (!rota) return null;
    const custo = estimarCustoRota(rota, lerNumeroRota(consumo), lerNumeroRota(preco), idaVolta, lerNumeroRota(orcamento), lerNumeroRota(autonomia));
    const links = linksNavegacaoRota(rota);
    const distanciaInicioKm = resultados.find(r => r.rota.id === rota.id)?.distanciaInicioKm ?? null;
    return <Cartao>
        <Text style={TIPO.rotulo}>{rota.regiao}</Text>
        <Text style={TIPO.titulo}>{rota.nome}</Text>
        <Ajuda>{rota.inicio.cidade} → {rota.fim.cidade}</Ajuda>
        <Ajuda>{rota.distanciaKm} km de ida · {ROTULOS_PAVIMENTO[rota.pavimento]} · {ROTULOS_CURVAS[rota.curvas]}</Ajuda>
        {distanciaInicioKm !== null && <Ajuda>Início a {distanciaInicioKm.toFixed(1)} km em linha reta</Ajuda>}
        {rota.descricao && <Ajuda>{rota.descricao}</Ajuda>}
        <TituloCartao icone="calculator-outline">Planejar gastos</TituloCartao>
        <Numero rotulo="Consumo da moto (km/l)" valor={consumo} mudar={setConsumo} placeholder="Informe sua média" />
        <Numero rotulo="Preço do combustível (R$/l)" valor={preco} mudar={setPreco} placeholder="Informe o preço local" />
        <View style={styles.linha}>
          <Text style={[TIPO.corpo, { flex: 1 }]}>Ida e volta pelo mesmo trecho</Text>
          <Switch accessibilityLabel="Calcular ida e volta pelo mesmo trecho" value={idaVolta} onValueChange={setIdaVolta} trackColor={{ false: COLORS.lineStrong, true: COLORS.inkMuted }} thumbColor={COLORS.ink} />
        </View>
        <Numero rotulo="Orçamento do trecho (R$, opcional)" valor={orcamento} mudar={setOrcamento} placeholder="Sem limite" />
        <Numero rotulo="Autonomia planejada (km, opcional)" valor={autonomia} mudar={setAutonomia} placeholder="Sem avaliação" />
        {invalido && <Text style={estilosBase.erro} accessibilityRole="alert">Use valores maiores que zero, com vírgula ou ponto decimal.</Text>}
        {!calculoValido && <Ajuda>Informe consumo e preço para calcular os gastos.</Ajuda>}
        <Ajuda>{AVISO_CUSTO_ROTAS}</Ajuda>
        <View style={styles.custo}>
          <Text style={TIPO.rotulo}>ESTIMATIVA · {idaVolta ? 'IDA E VOLTA' : 'IDA'} · {custo.distancia} KM</Text>
          <Text style={TIPO.titulo}>{formatarReaisRota(custo.total)}</Text>
          <Ajuda>Combustível: {formatarReaisRota(custo.combustivel)}</Ajuda>
          <Ajuda>Pedágios do catálogo: {custo.pedagios === null ? 'não informados' : formatarReaisRota(custo.pedagios)}</Ajuda>
        </View>
        {custo.acimaOrcamento && <Text style={estilosBase.erro}>Acima do orçamento informado para o trecho.</Text>}
        {custo.alertaAutonomia && <Text style={estilosBase.erro}>O trecho sem posto do catálogo supera sua autonomia planejada.</Text>}
        <Ajuda>Revisão informada na origem: {rota.revisao ?? 'sem data'} · Não revisada pelo MotoRede</Ajuda>
          <View style={estilosBase.divisoria} />
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
          {rota.fontes.filter(fonteRotaSegura).length > 0 && <><TituloCartao>Fontes e referências</TituloCartao>{rota.fontes.filter(fonteRotaSegura).map((fonte, i) => <Botao key={fonte} rotulo={`Consultar fonte ${i + 1}`} icone="open-outline" onPress={() => void abrir(fonte)} />)}</>}

    </Cartao>;
  };
  const cabecalho = <View style={styles.cabecalho}>
    <TituloTela sobrelinha="A ESTRADA COMEÇA AQUI" titulo="Encontre sua próxima rota" descricao="Descubra estradas, guarde seus passeios e planeje a saída." />
    <View style={styles.abas}>
      {(['explorar', 'salvas'] as const).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: modo === tab }} onPress={() => setModo(tab)} style={[styles.aba, modo === tab && styles.abaAtiva]}>
        <Ionicons name={tab === 'explorar' ? 'compass-outline' : 'bookmark-outline'} size={20} color={modo === tab ? COLORS.ink : COLORS.inkMuted} />
        <Text style={TIPO.corpo}>{tab === 'explorar' ? 'Explorar' : `Salvas · ${totalSalvas}`}</Text>
      </Pressable>)}
    </View>
    <Campo accessibilityLabel="Buscar rota por nome, cidade ou estado" value={busca} onChangeText={setBusca} placeholder="Busque uma rota ou cidade" returnKeyType="search" />
    <View style={styles.opcoes}>
      <Botao compacto rotulo="Perto de mim" icone="locate-outline" carregando={localizando} variante={ordem === 'proximidade' ? 'action' : 'secundario'} onPress={() => void localizar()} />
      <Botao compacto rotulo="Até 100 km" variante={filtros.extensao === 'curta' ? 'action' : 'secundario'} onPress={() => setFiltros({ ...filtros, extensao: filtros.extensao === 'curta' ? '' : 'curta' })} />
      <Botao compacto rotulo="Asfalto" variante={filtros.pavimento === 'asfalto' ? 'action' : 'secundario'} onPress={() => setFiltros({ ...filtros, pavimento: filtros.pavimento === 'asfalto' ? '' : 'asfalto' })} />
    </View>
    <View style={styles.linha}>
      <Botao flex rotulo={`Filtros${ativos.length ? ` · ${ativos.length}` : ''}`} icone="options-outline" onPress={() => { setRascunho({ ...filtros }); setFiltrando(true); }} />
      <Botao flex rotulo={ordem === 'extensao' ? 'Por nome' : 'Menor percurso'} icone="swap-vertical-outline" onPress={() => setOrdem(ordem === 'extensao' ? 'nome' : 'extensao')} />
    </View>
    {ativos.length > 0 && <View style={styles.opcoes}>{ativos.map(([chave, valor]) => <Pressable key={chave} style={styles.opcao} accessibilityRole="button" accessibilityLabel={`Remover filtro ${valor}`} onPress={() => setFiltros({ ...filtros, [chave]: '' })}><Text style={TIPO.apoio}>{valor} ×</Text></Pressable>)}</View>}
    {erro !== '' && <Text style={estilosBase.erro} accessibilityRole="alert">{erro}</Text>}
    {salvas.erro !== '' && <Text style={estilosBase.erro} accessibilityRole="alert">{salvas.erro}</Text>}
    <View style={styles.linha}>
      <Text style={[TIPO.tituloCard, { flex: 1 }]} accessibilityLiveRegion="polite">{resultados.length} {resultados.length === 1 ? 'rota' : 'rotas'}{modo === 'salvas' ? ' salvas' : ' para explorar'}</Text>
      {(busca || ativos.length > 0) && <Botao compacto variante="fantasma" rotulo="Limpar" onPress={limpar} />}
    </View>
    <Ajuda>{ordem === 'proximidade' ? 'Por proximidade ao início, em linha reta' : ordem === 'extensao' ? 'Do menor para o maior percurso' : 'Em ordem alfabética'} · Dados ainda não revisados</Ajuda>
  </View>;

  return <View style={{ flex: 1 }}>
    <FlatList<ItemRota> ref={lista} data={visiveis} keyExtractor={({ rota }) => rota.id} keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.lista} initialNumToRender={6} maxToRenderPerBatch={8} windowSize={5}
      ListHeaderComponent={cabecalho} ItemSeparatorComponent={<View style={{ height: ESPACO.md }} />}
      ListEmptyComponent={<Cartao><TituloCartao icone="compass-outline">{modo === 'salvas' && totalSalvas === 0 ? 'Sua próxima viagem pode começar aqui' : 'Nenhuma rota encontrada'}</TituloCartao><Ajuda>{modo === 'salvas' && totalSalvas === 0 ? 'Toque no marcador de uma rota para guardá-la neste aparelho.' : 'Experimente outra cidade ou remova alguns filtros.'}</Ajuda><Botao rotulo={modo === 'salvas' && totalSalvas === 0 ? 'Explorar rotas' : 'Limpar busca e filtros'} onPress={() => { limpar(); if (totalSalvas === 0) setModo('explorar'); }} /></Cartao>}
      renderItem={({ item: { rota, distanciaInicioKm } }) => <Cartao>
        <View style={styles.linha}>
          <View style={styles.selo}><Ionicons name="trail-sign-outline" size={24} color={COLORS.brandText} /></View>
          <Text style={[TIPO.rotulo, { flex: 1 }]}>{rota.regiao}</Text>
          <Pressable disabled={!salvas.pronto || salvas.gravando} accessibilityRole="button" accessibilityLabel={`${idsSalvos.has(rota.id) ? 'Remover das salvas' : 'Salvar rota'}: ${rota.nome}`} accessibilityState={{ selected: idsSalvos.has(rota.id), disabled: !salvas.pronto || salvas.gravando }} style={styles.marcador} onPress={() => void salvas.alternar(rota.id)}><Ionicons name={idsSalvos.has(rota.id) ? 'bookmark' : 'bookmark-outline'} size={23} color={COLORS.ink} /></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${rota.nome}`} onPress={() => setAberta(rota.id)} style={styles.campo}>
          <Text style={TIPO.tituloCard}>{rota.nome}</Text><Ajuda>{rota.inicio.cidade} → {rota.fim.cidade}</Ajuda>
          <View style={styles.metricas}><Text style={TIPO.corpo}>{rota.distanciaKm} km</Text><Text style={TIPO.apoio}>{ROTULOS_PAVIMENTO[rota.pavimento]}</Text><Text style={TIPO.apoio}>{ROTULOS_CURVAS[rota.curvas]}</Text></View>
          {distanciaInicioKm !== null && <Ajuda>Início a {distanciaInicioKm.toFixed(1)} km em linha reta</Ajuda>}
          <View style={styles.detalhes}><Text style={[TIPO.corpo, { flex: 1, fontWeight: '700' }]}>Conhecer rota</Text><Ionicons name="arrow-forward" size={20} color={COLORS.ink} /></View>
        </Pressable>
      </Cartao>}
      ListFooterComponent={resultados.length > 0 ? <View style={styles.rodape}><Ajuda>{visiveis.length} de {resultados.length} rotas</Ajuda>{limite < resultados.length && <Botao rotulo={`Carregar mais ${Math.min(TAMANHO_LOTE_ROTAS, resultados.length - limite)}`} onPress={() => setLimite(l => l + TAMANHO_LOTE_ROTAS)} />}</View> : null}
    />
    <Modal visible={filtrando} transparent animationType="slide" onRequestClose={() => setFiltrando(false)}>
      <View style={styles.veu}><SafeAreaView edges={['bottom']} style={styles.folha}>
        <View style={styles.barra}><Text accessibilityRole="header" style={[TIPO.tituloCard, { flex: 1 }]}>Refinar sua busca</Text><Botao compacto variante="fantasma" rotulo="Cancelar" onPress={() => setFiltrando(false)} /></View>
        <ScrollView contentContainerStyle={styles.formulario}>
          <Opcoes rotulo="Região" valor={rascunho.regiao ?? ''} opcoes={REGIOES} mudar={v => setRascunho({ ...rascunho, regiao: v })} />
          <Opcoes rotulo="Extensão do percurso" valor={rascunho.extensao ?? ''} opcoes={ROTULOS_EXTENSAO} mudar={v => setRascunho({ ...rascunho, extensao: v as Escolhas['extensao'] })} />
          <Opcoes rotulo="Pavimento" valor={rascunho.pavimento ?? ''} opcoes={ROTULOS_PAVIMENTO} mudar={v => setRascunho({ ...rascunho, pavimento: v as PavimentoRota | '' })} />
          <Opcoes rotulo="Curvas" valor={rascunho.curvas ?? ''} opcoes={ROTULOS_CURVAS} mudar={v => setRascunho({ ...rascunho, curvas: v as CurvasRota | '' })} />
          <Botao variante="fantasma" rotulo="Limpar filtros" onPress={() => setRascunho(SEM_FILTROS)} />
        </ScrollView>
        <View style={styles.barra}><Botao flex variante="action" rotulo={`Ver ${quantidadeRascunho} rotas`} onPress={() => { setFiltros(rascunho); setFiltrando(false); }} /></View>
      </SafeAreaView></View>
    </Modal>
    <Modal visible={!!rotaSelecionada} animationType="slide" onRequestClose={() => setAberta(null)}>
      <SafeAreaView style={styles.tela}>
        <View style={styles.barra}><Botao flex rotulo="Voltar às rotas" icone="arrow-back" variante="fantasma" onPress={() => setAberta(null)} /><Botao compacto rotulo={aberta && idsSalvos.has(aberta) ? 'Salva' : 'Salvar'} icone={aberta && idsSalvos.has(aberta) ? 'bookmark' : 'bookmark-outline'} disabled={!salvas.pronto || salvas.gravando} onPress={() => { if (aberta) void salvas.alternar(aberta); }} /></View>
        <ScrollView contentContainerStyle={estilosBase.conteudo} keyboardShouldPersistTaps="handled">
          {erro !== '' && <Text style={estilosBase.erro} accessibilityRole="alert">{erro}</Text>}
          {salvas.erro !== '' && <Text style={estilosBase.erro} accessibilityRole="alert">{salvas.erro}</Text>}
          <Ajuda>{AVISO_CATALOGO_ROTAS}</Ajuda>{renderDetalhe()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COLORS.canvas },
  lista: { padding: ESPACO.lg, paddingBottom: ESPACO.xxl },
  cabecalho: { gap: ESPACO.lg, paddingBottom: ESPACO.lg },
  abas: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  aba: { flex: 1, minHeight: ALVO.botao, gap: ESPACO.sm, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  abaAtiva: { borderBottomColor: COLORS.brand },
  marcador: { minWidth: ALVO.min, minHeight: ALVO.min, alignItems: 'center', justifyContent: 'center' },
  selo: { backgroundColor: COLORS.elevated, padding: ESPACO.md, borderRadius: RAIO.md },
  metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.md, paddingVertical: ESPACO.sm },
  rodape: { gap: ESPACO.md, alignItems: 'center', paddingVertical: ESPACO.xl },
  veu: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  folha: { maxHeight: '92%', backgroundColor: COLORS.surface, borderTopLeftRadius: RAIO.lg, borderTopRightRadius: RAIO.lg },
  formulario: { padding: ESPACO.lg, gap: ESPACO.xl },
  barra: { padding: ESPACO.md, flexDirection: 'row', gap: ESPACO.sm, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.line },
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
