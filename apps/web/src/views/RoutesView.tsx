import React, { useState } from 'react';
import { Route, ChevronDown, ExternalLink, Fuel, MapPin } from 'lucide-react';
import {
  CATALOGO_ROTAS, AVISO_CATALOGO_ROTAS, AVISO_CUSTO_ROTAS, AVISO_NAVEGACAO_ROTAS,
  ROTULOS_PAVIMENTO, ROTULOS_CURVAS, buscarRotas, estimarCustoRota,
  lerNumeroRota, formatarReaisRota, linksNavegacaoRota, fonteRotaSegura,
  type Motorcycle, type GeoPoint, type PavimentoRota, type CurvasRota,
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

export function RoutesView({ motorcycle, origem }: { motorcycle: Motorcycle | null; origem: GeoPoint | null }) {
  const [busca, setBusca] = useState('');
  const [pavimento, setPavimento] = useState<PavimentoRota | ''>('');
  const [curvas, setCurvas] = useState<CurvasRota | ''>('');
  const [consumo, setConsumo] = useState(() => motorcycle?.avgConsumptionKmL?.toString() ?? '');
  const [preco, setPreco] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [autonomia, setAutonomia] = useState('');
  const [idaVolta, setIdaVolta] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const resultados = buscarRotas(CATALOGO_ROTAS, { busca, pavimento, curvas, origem });
  const calculoValido = lerNumeroRota(consumo) !== null && lerNumeroRota(preco) !== null;
  const invalido = [consumo, preco, orcamento, autonomia].some((v) => v.trim() !== '' && lerNumeroRota(v) === null);

  return <div className="max-w-4xl mx-auto space-y-5 px-4 py-3 pb-6">
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-wider font-bold text-ink-muted">Planeje sua próxima saída</p>
      <h1 className="text-3xl font-extrabold text-ink flex items-center gap-3"><Route aria-hidden="true" />Rotas</h1>
      <p className="text-ink-muted">Encontre um roteiro, estime os gastos e siga com seu navegador.</p>
    </header>
    <p className="text-sm text-ink-muted border-l-2 border-line-strong pl-3">{AVISO_CATALOGO_ROTAS}</p>

    <section className={cartao} aria-label="Busca e planejamento">
      <label className="block space-y-2 text-sm text-ink-muted">
        <span>Nome, cidade ou estado</span>
        <input className={campo} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: serra, Paraty, SP" />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-2 text-sm text-ink-muted"><span>Pavimento</span>
          <select className={campo} value={pavimento} onChange={(e) => setPavimento(e.target.value as PavimentoRota | '')}>
            <option value="">Qualquer pavimento</option>
            {Object.entries(ROTULOS_PAVIMENTO).map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm text-ink-muted"><span>Curvas</span>
          <select className={campo} value={curvas} onChange={(e) => setCurvas(e.target.value as CurvasRota | '')}>
            <option value="">Qualquer nível de curvas</option>
            {Object.entries(ROTULOS_CURVAS).map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}
          </select>
        </label>
        <Numero rotulo="Consumo da moto (km/l)" valor={consumo} mudar={setConsumo} placeholder="Informe sua média" />
        <Numero rotulo="Preço do combustível (R$/l)" valor={preco} mudar={setPreco} placeholder="Informe o preço local" />
      </div>
      <label className="min-h-12 flex items-center gap-3 text-ink font-medium cursor-pointer">
        <input type="checkbox" checked={idaVolta} onChange={(e) => setIdaVolta(e.target.checked)} className="w-5 h-5 accent-current" />
        Calcular ida e volta pelo mesmo trecho
      </label>
      <details>
        <summary className="min-h-12 flex items-center cursor-pointer text-sm font-bold text-ink">Orçamento e autonomia (opcionais)</summary>
        <div className="grid sm:grid-cols-2 gap-4 pt-3">
          <Numero rotulo="Orçamento do trecho (R$)" valor={orcamento} mudar={setOrcamento} placeholder="Sem limite" />
          <Numero rotulo="Autonomia planejada (km)" valor={autonomia} mudar={setAutonomia} placeholder="Sem avaliação" />
        </div>
      </details>
      {invalido && <p role="alert" className="text-sm text-danger">Use valores maiores que zero, com vírgula ou ponto decimal.</p>}
      {!calculoValido && <p className="text-sm text-ink-muted">Informe consumo e preço para calcular o combustível e o custo estimado.</p>}
      <p className="text-sm text-ink-muted">{AVISO_CUSTO_ROTAS}</p>
    </section>

    <div className="flex flex-wrap justify-between items-center gap-2">
      <p role="status" className="text-sm text-ink-muted">{resultados.length} rota(s) · {origem ? 'por proximidade ao início, em linha reta' : 'por nome; localização indisponível'}</p>
      <button className={link} onClick={() => { setBusca(''); setPavimento(''); setCurvas(''); }}>Limpar busca e filtros</button>
    </div>
    {resultados.length === 0 && <p className={cartao}>Nenhuma rota corresponde à busca. Experimente outros filtros.</p>}
    {resultados.map(({ rota, distanciaInicioKm }) => {
      const custo = estimarCustoRota(rota, lerNumeroRota(consumo), lerNumeroRota(preco), idaVolta, lerNumeroRota(orcamento), lerNumeroRota(autonomia));
      const links = linksNavegacaoRota(rota);
      const expandida = aberta === rota.id;
      return <article key={rota.id} className={cartao}>
        <button className="w-full min-h-14 text-left flex justify-between items-start gap-4" onClick={() => setAberta(expandida ? null : rota.id)} aria-expanded={expandida} aria-controls={`rota-${rota.id}`}>
          <span className="space-y-2">
            <span className="block text-xs font-bold tracking-wider text-ink-muted">{rota.regiao}</span>
            <span className="block text-xl font-bold text-ink">{rota.nome}</span>
            <span className="block text-sm text-ink-muted">{rota.inicio.cidade} → {rota.fim.cidade}</span>
          </span>
          <ChevronDown className={`shrink-0 text-ink-muted transition-transform ${expandida ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <p className="text-sm text-ink-muted">{rota.distanciaKm} km de ida · {ROTULOS_PAVIMENTO[rota.pavimento]} · {ROTULOS_CURVAS[rota.curvas]}</p>
        {distanciaInicioKm !== null && <p className="text-sm text-ink-muted flex items-center gap-2"><MapPin size={16} aria-hidden="true" />Início a {distanciaInicioKm.toFixed(1)} km em linha reta</p>}
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
        <button className={link} onClick={() => setAberta(expandida ? null : rota.id)} aria-expanded={expandida} aria-controls={`rota-${rota.id}`}>
          {expandida ? 'Ocultar detalhes' : 'Ver detalhes e navegação'}
        </button>
        {expandida && <div id={`rota-${rota.id}`} className="space-y-4 border-t border-line pt-4">
          {rota.descricao && <p className="text-sm text-ink-muted">{rota.descricao}</p>}
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
          <section className="space-y-2"><h2 className="font-bold text-ink">Navegação</h2><p className="text-sm text-ink-muted">{AVISO_NAVEGACAO_ROTAS}</p>
            <div className="flex flex-wrap gap-3"><LinkExterno href={links.googleInicio}>Ir ao início · Google Maps</LinkExterno><LinkExterno href={links.wazeInicio}>Ir ao início · Waze</LinkExterno><LinkExterno href={links.googleTrecho}>Ver início → fim · Google Maps</LinkExterno></div>
          </section>
          {rota.fontes.filter(fonteRotaSegura).length > 0 && <section className="space-y-2"><h2 className="font-bold text-ink">Fontes informadas no BikerWay</h2><div className="flex flex-wrap gap-2">{rota.fontes.filter(fonteRotaSegura).map((fonte, i) => <LinkExterno key={fonte} href={fonte}>Fonte {i + 1}</LinkExterno>)}</div></section>}
        </div>}
      </article>;
    })}
  </div>;
}
