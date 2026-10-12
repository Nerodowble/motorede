import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Route, ArrowLeft, ArrowUpRight, Bookmark, Check, Compass, ExternalLink, Fuel, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useRotasSalvas } from '../hooks/useRotasSalvas';
import {
  CATALOGO_ROTAS, AVISO_CATALOGO_ROTAS, AVISO_CUSTO_ROTAS, AVISO_NAVEGACAO_ROTAS,
  ROTULOS_EXTENSAO, TAMANHO_LOTE_ROTAS, ROTULOS_PAVIMENTO, ROTULOS_CURVAS, buscarRotas, estimarCustoRota,
  lerNumeroRota, formatarReaisRota, linksNavegacaoRota, fonteRotaSegura,
  type FiltrosRotas, type Motorcycle, type GeoPoint, type PavimentoRota, type CurvasRota,
} from '@motorede/shared';

const campo = 'w-full min-h-14 rounded-xl border border-line-strong bg-elevated px-3 text-ink';
const cartao = 'rounded-2xl border border-line bg-surface p-5 space-y-4';
const link = 'min-h-12 rounded-xl border border-line-strong px-4 py-3 inline-flex items-center justify-center gap-2 text-sm font-bold text-ink hover:bg-elevated';

function Numero({ rotulo, valor, mudar, placeholder }: {
  rotulo: string; valor: string; mudar: (v: string) => void; placeholder?: string;
}) {
  return <label className="block space-y-2 text-sm text-ink-muted">
    <span>{rotulo}</span>
    <input className={campo} inputMode="decimal" value={valor} onChange={(e) => mudar(e.target.value)} placeholder={placeholder} />
  </label>;
}
function LinkExterno({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
    {children}<ExternalLink size={16} aria-hidden="true" />
  </a>;
}


type Escolhas = Pick<FiltrosRotas, 'regiao' | 'extensao' | 'pavimento' | 'curvas'>;
const SEM_FILTROS: Escolhas = { regiao: '', extensao: '', pavimento: '', curvas: '' };
const REGIOES = Object.fromEntries([...new Set(CATALOGO_ROTAS.map(r => r.regiao))].sort().map(r => [r, r]));
const chip = 'min-h-12 px-4 py-2 rounded-full border inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors';

function JanelaRotas({ titulo, fechar, children, detalhe = false }: { titulo: string; fechar: () => void; children: React.ReactNode; detalhe?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const aoFechar = useRef(fechar);
  aoFechar.current = fechar;
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  return createPortal(<dialog ref={ref} aria-labelledby="janela-rotas-titulo" onCancel={e => { e.preventDefault(); aoFechar.current(); }} className={`${detalhe ? 'h-dvh max-h-dvh w-screen max-w-none rounded-none' : 'max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl rounded-3xl'} m-auto p-0 border border-line bg-canvas text-ink backdrop:bg-black/80`}>
    <div className={detalhe ? 'max-w-3xl mx-auto' : ''}>
      <header className="sticky top-0 z-10 bg-canvas border-b border-line p-4 flex items-center justify-between gap-4">
        <h2 id="janela-rotas-titulo" className="font-bold text-lg">{titulo}</h2>
        <button autoFocus className={link} onClick={fechar}>{detalhe ? <ArrowLeft size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}{detalhe ? 'Voltar às rotas' : 'Cancelar'}</button>
      </header>
      <div className="p-5 sm:p-8 space-y-6">{children}</div>
    </div>
  </dialog>, document.body);
}
function Escolha({ titulo, valor, opcoes, mudar }: { titulo: string; valor: string; opcoes: Record<string, string>; mudar: (v: string) => void }) {
  return <label className="block space-y-2 text-sm text-ink-muted"><span>{titulo}</span><select className={campo} value={valor} onChange={e => mudar(e.target.value)}><option value="">Qualquer</option>{Object.entries(opcoes).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>;
}

export function RoutesView({ motorcycle, origem: origemInicial }: { motorcycle: Motorcycle | null; origem: GeoPoint | null }) {
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<Escolhas>(SEM_FILTROS);
  const [rascunho, setRascunho] = useState<Escolhas>(SEM_FILTROS);
  const [filtrando, setFiltrando] = useState(false);
  const [modo, setModo] = useState<'explorar' | 'salvas'>('explorar');
  const [ordem, setOrdem] = useState<NonNullable<FiltrosRotas['ordem']>>('nome');
  const [limite, setLimite] = useState(TAMANHO_LOTE_ROTAS);
  const [aberta, setAberta] = useState<string | null>(null);
  const [origem, setOrigem] = useState<GeoPoint | null>(origemInicial);
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
  const resultados = useMemo(() => buscarRotas(CATALOGO_ROTAS, { ...filtros, busca, ordem, origem })
    .filter(({ rota }) => modo !== 'salvas' || idsSalvos.has(rota.id)), [filtros, busca, ordem, origem, modo, idsSalvos]);
  const quantidadeRascunho = useMemo(() => buscarRotas(CATALOGO_ROTAS, { ...rascunho, busca })
    .filter(({ rota }) => modo !== 'salvas' || idsSalvos.has(rota.id)).length, [rascunho, busca, modo, idsSalvos]);
  // O detalhe abre sobre a lista montada: filtros, lote, foco e rolagem são preservados.
  useEffect(() => { setLimite(TAMANHO_LOTE_ROTAS); }, [busca, filtros, ordem, modo, origem]);
  const ativos = [
    ['regiao', filtros.regiao], ['extensao', filtros.extensao ? ROTULOS_EXTENSAO[filtros.extensao] : ''],
    ['pavimento', filtros.pavimento ? ROTULOS_PAVIMENTO[filtros.pavimento] : ''],
    ['curvas', filtros.curvas ? ROTULOS_CURVAS[filtros.curvas] : ''],
  ].filter(([, valor]) => valor) as [keyof Escolhas, string][];
  const limpar = () => { setBusca(''); setFiltros(SEM_FILTROS); };
  const localizar = () => {
    if (origem) { setOrdem('proximidade'); return; }
    setErro('');
    if (!navigator.geolocation) { setErro('Localização indisponível. Busque por cidade ou região.'); return; }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(p => {
      setOrigem({ lat: p.coords.latitude, lng: p.coords.longitude }); setOrdem('proximidade'); setLocalizando(false);
    }, () => { setErro('Não foi possível obter sua posição. Verifique a permissão ou busque por cidade.'); setLocalizando(false); }, { timeout: 12000, maximumAge: 60000 });
  };
  const rotaSelecionada = CATALOGO_ROTAS.find(r => r.id === aberta);
  const calculoValido = lerNumeroRota(consumo) !== null && lerNumeroRota(preco) !== null;
  const invalido = [consumo, preco, orcamento, autonomia].some(v => v.trim() !== '' && lerNumeroRota(v) === null);
  const renderDetalhe = () => {
    const rota = rotaSelecionada;
    if (!rota) return null;
    if (rota.restricaoMoto) return <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">{rota.nome}</h1>
      <h2 className="text-xl font-bold">Trecho com acesso restrito para motos</h2>
      <p role="alert" className="text-ink">{rota.restricaoMoto.motivo}</p>
      <p className="text-ink-muted">{rota.descricao}</p>
      <p className="text-ink-muted">Um desvio sugerido pelo navegador até a cidade final não representa este passeio.</p>
      <LinkExterno href={rota.restricaoMoto.fonte}>Consultar acesso no site oficial</LinkExterno>
      <LinkExterno href={linksNavegacaoRota(rota).googleInicio}>Ir somente ao início cadastrado · Google Maps</LinkExterno>
    </div>;
    const custo = estimarCustoRota(rota, lerNumeroRota(consumo), lerNumeroRota(preco), idaVolta, lerNumeroRota(orcamento), lerNumeroRota(autonomia));
    const links = linksNavegacaoRota(rota);
    return <div className="space-y-6">
      <p className="text-sm font-bold uppercase tracking-wide text-ink-muted">{rota.regiao}</p>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{rota.nome}</h1>
      <p className="text-ink-muted">{rota.inicio.cidade} → {rota.fim.cidade}</p>
      <div className="flex flex-wrap gap-3 text-sm"><span>{rota.distanciaKm} km de ida</span><span>· {ROTULOS_PAVIMENTO[rota.pavimento]}</span><span>· {ROTULOS_CURVAS[rota.curvas]}</span></div>
      <button disabled={!salvas.pronto} aria-pressed={idsSalvos.has(rota.id)} className={link} onClick={() => salvas.alternar(rota.id)}><Bookmark size={18} fill={idsSalvos.has(rota.id) ? 'currentColor' : 'none'} aria-hidden="true" />{idsSalvos.has(rota.id) ? 'Salva neste navegador' : 'Salvar rota'}</button>
      {salvas.erro && <p role="alert" className="text-danger">{salvas.erro}</p>}
      <p className="text-sm text-ink-muted border-l-2 border-line-strong pl-3">{AVISO_CATALOGO_ROTAS}</p>
      {rota.descricao && <p className="text-ink-muted leading-relaxed">{rota.descricao}</p>}
      <section className={cartao} aria-label="Planejamento de gastos">
        <h2 className="text-xl font-bold">Gastos do trecho cadastrado</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Numero rotulo="Consumo da moto (km/l)" valor={consumo} mudar={setConsumo} placeholder="Informe sua média" />
          <Numero rotulo="Preço do combustível (R$/l)" valor={preco} mudar={setPreco} placeholder="Informe o preço local" />
          <Numero rotulo="Orçamento do trecho (R$, opcional)" valor={orcamento} mudar={setOrcamento} placeholder="Sem limite" />
          <Numero rotulo="Autonomia planejada (km, opcional)" valor={autonomia} mudar={setAutonomia} placeholder="Sem avaliação" />
        </div>
        <label className="min-h-12 flex items-center gap-3"><input type="checkbox" className="w-5 h-5 accent-current" checked={idaVolta} onChange={e => setIdaVolta(e.target.checked)} />Ida e volta pelo mesmo trecho</label>
        {invalido && <p role="alert" className="text-sm text-danger">Use valores maiores que zero, com vírgula ou ponto decimal.</p>}
        {!calculoValido && <p className="text-sm text-ink-muted">Informe consumo e preço para calcular os gastos.</p>}
        <p className="text-sm text-ink-muted">{AVISO_CUSTO_ROTAS}</p>
        <div className="rounded-xl bg-elevated p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Estimativa · {idaVolta ? 'ida e volta' : 'ida'} · {custo.distancia} km</p>
          <p className="text-2xl font-bold text-ink">{formatarReaisRota(custo.total)}</p>
          <p className="text-sm text-ink-muted flex flex-wrap gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2"><Fuel size={16} aria-hidden="true" />Combustível: {formatarReaisRota(custo.combustivel)}</span>
            <span>Pedágios do catálogo: {custo.pedagios === null ? 'não informados' : formatarReaisRota(custo.pedagios)}</span>
          </p>
        </div>
        {custo.acimaOrcamento && <p className="text-sm text-danger">Acima do orçamento informado para o trecho.</p>}
        {custo.alertaAutonomia && <p className="text-sm text-danger">O trecho sem posto do catálogo supera sua autonomia planejada.</p>}
        <p className="text-xs text-ink-muted">Revisão informada na origem: {rota.revisao ?? 'sem data'} · Não revisada pelo MotoRede</p>
      </section>
        <div className="space-y-4 border-t border-line pt-4">
          {rota.dificuldade && <p className="text-sm text-ink">Dificuldade do catálogo: {rota.dificuldade}</p>}
          {rota.melhorEpoca && <p className="text-sm text-ink-muted">Época sugerida no catálogo: {rota.melhorEpoca}</p>}
          <p className="text-sm text-ink-muted">Trecho sem posto informado: {rota.trechoSemPostoKm} km. Confirme a disponibilidade de abastecimento.</p>
          <section className="space-y-2"><h2 className="font-bold text-ink">Pedágios de moto · uma passagem</h2>
            {rota.pedagios?.length ? rota.pedagios.map((p, i) => <div key={`${p.nome}-${i}`} className="text-sm text-ink-muted">
              <p>{p.nome} · {formatarReaisRota(p.valorMoto)} · {p.sistema === 'free_flow' ? 'Cobrança automática (free flow)' : 'Praça física'}</p>
              {p.fonte && fonteRotaSegura(p.fonte) && <a className="underline inline-block py-3" href={p.fonte} target="_blank" rel="noopener noreferrer">Consultar fonte da tarifa</a>}
            </div>) : <p className="text-sm text-ink-muted">{rota.pedagioIda === 0 ? 'Nenhum pedágio cadastrado na origem; confirme a situação atual.' : 'Praças não detalhadas no catálogo.'}</p>}
          </section>
          <section className="space-y-3"><h2 className="font-bold text-ink">Pontos de apoio do catálogo</h2>
            {rota.pontosApoio.map((p, i) => <div key={`${p.nome}-${i}`} className="text-sm text-ink-muted border-l border-line-strong pl-3"><p className="font-bold text-ink">{p.nome}</p><p>{p.descricao}</p></div>)}
            {rota.pontosApoio.length === 0 && <p className="text-sm text-ink-muted">Nenhum ponto cadastrado.</p>}
          </section>
          {rota.observacoes.length > 0 && <section className="space-y-2"><h2 className="font-bold text-ink">Observações da origem · não verificadas</h2><ul className="list-disc pl-5 space-y-2 text-sm text-ink-muted">{rota.observacoes.map((o, i) => <li key={i}>{o}</li>)}</ul></section>}
          <section className="space-y-2"><h2 className="font-bold text-ink">Navegação</h2>
            <p className="text-sm text-ink-muted">Monte uma única viagem: sua localização → {rota.inicio.cidade} (início) → {rota.fim.cidade} (final). O Google Maps usa sua posição atual ou solicita o ponto de partida.</p>
            <p className="text-sm text-ink-muted">{AVISO_NAVEGACAO_ROTAS}</p>
            <div className="flex flex-wrap gap-3">{links.googleViagem && <LinkExterno href={links.googleViagem}>Montar viagem · Google Maps</LinkExterno>}<LinkExterno href={links.googleInicio}>Somente até o início · Google Maps</LinkExterno><LinkExterno href={links.wazeInicio}>Somente até o início · Waze</LinkExterno>{links.googleTrecho && <LinkExterno href={links.googleTrecho}>Ver início → fim · Google Maps</LinkExterno>}</div>
          </section>
          {rota.fontes.filter(fonteRotaSegura).length > 0 && <section className="space-y-2"><h2 className="font-bold text-ink">Fontes e referências</h2><div className="flex flex-wrap gap-2">{rota.fontes.filter(fonteRotaSegura).map((fonte, i) => <LinkExterno key={fonte} href={fonte}>Fonte {i + 1}</LinkExterno>)}</div></section>}
        </div>
    </div>;
  };
  return <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
    <header className="space-y-3"><p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">A estrada começa aqui</p><h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Encontre sua próxima rota</h1><p className="text-ink-muted">Descubra estradas, guarde seus passeios e planeje a saída.</p></header>
    <div role="tablist" aria-label="Coleção de rotas" className="flex border-b border-line gap-6">
      {(['explorar', 'salvas'] as const).map(tab => <button key={tab} id={`aba-rotas-${tab}`} role="tab" tabIndex={modo === tab ? 0 : -1} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const proxima = e.key === 'Home' ? 'explorar' : e.key === 'End' ? 'salvas' : tab === 'explorar' ? 'salvas' : 'explorar'; setModo(proxima); document.getElementById(`aba-rotas-${proxima}`)?.focus(); } }} aria-selected={modo === tab} aria-controls="resultados-rotas" className={`min-h-14 inline-flex items-center gap-2 border-b-2 font-bold ${modo === tab ? 'border-brand text-ink' : 'border-transparent text-ink-muted'}`} onClick={() => setModo(tab)}>{tab === 'explorar' ? <Compass size={20} aria-hidden="true" /> : <Bookmark size={20} aria-hidden="true" />}{tab === 'explorar' ? 'Explorar' : `Salvas · ${totalSalvas}`}</button>)}
    </div>
    <section className="space-y-4" aria-label="Encontrar rotas">
      <div className="flex flex-wrap sm:flex-nowrap gap-3"><label className="flex-1 min-w-52 relative"><span className="sr-only">Buscar rota por nome, cidade ou estado</span><Search aria-hidden="true" size={20} className="absolute left-4 top-4 text-ink-muted" /><input className={`${campo} pl-12`} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Busque uma rota ou cidade" type="search" /></label><button className={link} onClick={() => { setRascunho({ ...filtros }); setFiltrando(true); }}><SlidersHorizontal size={18} aria-hidden="true" />Filtros{ativos.length ? ` · ${ativos.length}` : ''}</button></div>
      <div className="flex flex-wrap gap-2">
        <button disabled={localizando} aria-pressed={ordem === 'proximidade'} className={`${chip} ${ordem === 'proximidade' ? 'bg-action text-on-action border-action' : 'border-line-strong text-ink'}`} onClick={localizar}><MapPin size={16} aria-hidden="true" />{localizando ? 'Localizando…' : 'Perto de mim'}</button>
        <button aria-pressed={filtros.extensao === 'curta'} className={`${chip} ${filtros.extensao === 'curta' ? 'bg-action text-on-action border-action' : 'border-line-strong text-ink'}`} onClick={() => setFiltros({ ...filtros, extensao: filtros.extensao === 'curta' ? '' : 'curta' })}>Até 100 km</button>
        <button aria-pressed={filtros.pavimento === 'asfalto'} className={`${chip} ${filtros.pavimento === 'asfalto' ? 'bg-action text-on-action border-action' : 'border-line-strong text-ink'}`} onClick={() => setFiltros({ ...filtros, pavimento: filtros.pavimento === 'asfalto' ? '' : 'asfalto' })}>Asfalto</button>
      </div>
      {ativos.length > 0 && <div className="flex flex-wrap gap-2">{ativos.map(([chave, valor]) => <button key={chave} className={`${chip} bg-elevated border-line`} aria-label={`Remover filtro ${valor}`} onClick={() => setFiltros({ ...filtros, [chave]: '' })}>{valor}<X size={14} aria-hidden="true" /></button>)}</div>}
      {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}{salvas.erro && <p role="alert" className="text-sm text-danger">{salvas.erro}</p>}
    </section>
    <section id="resultados-rotas" role="tabpanel" aria-labelledby={`aba-rotas-${modo}`} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 role="status" className="text-xl font-bold">{resultados.length} {resultados.length === 1 ? 'rota' : 'rotas'}{modo === 'salvas' ? ' salvas' : ' para explorar'}</h2><p className="text-xs text-ink-muted mt-1">Dados ainda não revisados · confirme as condições antes de sair</p></div><label className="flex items-center gap-2 text-sm"><span>Ordenar</span><select className="min-h-12 rounded-xl bg-elevated border border-line-strong px-3" value={ordem} onChange={e => { const v = e.target.value as typeof ordem; if (v === 'proximidade') localizar(); else setOrdem(v); }}><option value="nome">Por nome</option><option value="extensao">Menor percurso</option><option value="proximidade">Perto de mim</option></select></label></div>
      {ordem === 'proximidade' && <p className="text-sm text-ink-muted">Proximidade ao início em linha reta, não distância pela estrada.</p>}
      {resultados.length === 0 && <div className={`${cartao} text-center py-12`}><Compass className="mx-auto text-ink-muted" size={32} aria-hidden="true" /><h3 className="text-xl font-bold">{modo === 'salvas' && totalSalvas === 0 ? 'Sua próxima viagem pode começar aqui' : 'Nenhuma rota encontrada'}</h3><p className="text-ink-muted">{modo === 'salvas' && totalSalvas === 0 ? 'Use o marcador para guardar rotas neste navegador.' : 'Experimente outra cidade ou remova alguns filtros.'}</p><button className={link} onClick={() => { limpar(); if (totalSalvas === 0) setModo('explorar'); }}>{modo === 'salvas' && totalSalvas === 0 ? 'Explorar rotas' : 'Limpar busca e filtros'}</button></div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{resultados.slice(0, limite).map(({ rota, distanciaInicioKm }) => <article key={rota.id} className="group rounded-2xl border border-line bg-surface p-5 flex flex-col gap-3 hover:border-line-strong transition-colors">
        <div className="flex items-center gap-3"><span className="rounded-xl p-3 bg-elevated text-brand"><Route size={22} aria-hidden="true" /></span><span className="flex-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{rota.regiao}</span><button disabled={!salvas.pronto} className="min-h-12 min-w-12 inline-flex items-center justify-center rounded-xl hover:bg-elevated" aria-pressed={idsSalvos.has(rota.id)} aria-label={`${idsSalvos.has(rota.id) ? 'Remover das salvas' : 'Salvar rota'}: ${rota.nome}`} onClick={() => salvas.alternar(rota.id)}><Bookmark size={22} fill={idsSalvos.has(rota.id) ? 'currentColor' : 'none'} aria-hidden="true" /></button></div>
        <h3 className="text-xl font-bold leading-snug">{rota.nome}</h3><p className="text-sm text-ink-muted">{rota.inicio.cidade} → {rota.fim.cidade}</p>
        {rota.restricaoMoto && <p className="text-sm text-danger">Trecho com acesso restrito para motos</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm"><span className="font-bold text-ink">{rota.distanciaKm} km</span><span className="text-ink-muted">{ROTULOS_PAVIMENTO[rota.pavimento]}</span><span className="text-ink-muted">{ROTULOS_CURVAS[rota.curvas]}</span></div>
        {distanciaInicioKm !== null && <p className="text-xs text-ink-muted">Início a {distanciaInicioKm.toFixed(1)} km em linha reta</p>}
        <button className="mt-auto pt-4 min-h-12 flex items-center justify-between gap-3 border-t border-line font-bold text-sm text-ink" aria-label={`Ver detalhes de ${rota.nome}`} onClick={() => setAberta(rota.id)}>Conhecer rota<ArrowUpRight size={18} aria-hidden="true" /></button>
      </article>)}</div>
      {resultados.length > 0 && <div className="py-6 flex flex-col items-center gap-3"><p className="text-sm text-ink-muted" role="status">{Math.min(limite, resultados.length)} de {resultados.length} rotas</p>{limite < resultados.length && <button className={link} onClick={() => setLimite(l => l + TAMANHO_LOTE_ROTAS)}>Carregar mais {Math.min(TAMANHO_LOTE_ROTAS, resultados.length - limite)}</button>}{(busca || ativos.length > 0) && <button className={link} onClick={limpar}>Limpar busca e filtros</button>}</div>}
    </section>
    {filtrando && <JanelaRotas titulo="Refinar sua busca" fechar={() => setFiltrando(false)}><Escolha titulo="Região" valor={rascunho.regiao ?? ''} opcoes={REGIOES} mudar={v => setRascunho({ ...rascunho, regiao: v })} /><Escolha titulo="Extensão do percurso" valor={rascunho.extensao ?? ''} opcoes={ROTULOS_EXTENSAO} mudar={v => setRascunho({ ...rascunho, extensao: v as Escolhas['extensao'] })} /><Escolha titulo="Pavimento" valor={rascunho.pavimento ?? ''} opcoes={ROTULOS_PAVIMENTO} mudar={v => setRascunho({ ...rascunho, pavimento: v as PavimentoRota | '' })} /><Escolha titulo="Curvas" valor={rascunho.curvas ?? ''} opcoes={ROTULOS_CURVAS} mudar={v => setRascunho({ ...rascunho, curvas: v as CurvasRota | '' })} /><div className="flex flex-wrap justify-between gap-3"><button className={link} onClick={() => setRascunho(SEM_FILTROS)}>Limpar filtros</button><button className="min-h-12 rounded-xl px-5 py-3 inline-flex items-center justify-center gap-2 text-sm font-bold bg-action text-on-action hover:opacity-90" onClick={() => { setFiltros(rascunho); setFiltrando(false); }}><Check size={18} aria-hidden="true" />Ver {quantidadeRascunho} rotas</button></div></JanelaRotas>}
    {rotaSelecionada && <JanelaRotas titulo="Detalhes da rota" detalhe fechar={() => setAberta(null)}>{renderDetalhe()}</JanelaRotas>}
  </div>;
}
