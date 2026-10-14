import React, { useMemo, useState } from 'react';
import { ExternalLink, MapPin, Search, Stamp } from 'lucide-react';
import {
  MONUMENTOS_ROTA_BIKER, AVISO_ROTA_BIKER, SITE_ROTA_BIKER, buscarMonumentos, linkMapaMonumento, linkInstagramMonumento,
  type GeoPoint, type MonumentoRotaBiker,
} from '@motorede/shared';

const link = 'min-h-12 rounded-xl border border-line-strong px-4 py-3 inline-flex items-center justify-center gap-2 text-sm font-bold text-ink hover:bg-elevated';
const chip = 'min-h-12 px-4 py-2 rounded-full border inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors';

function LinkExterno({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={link}>{children}<ExternalLink size={16} aria-hidden="true" /></a>;
}

/** Card de um ponto de carimbo; também usado nos detalhes da rota. */
export function CartaoMonumento({ monumento: m, distanciaKm = null }: { monumento: MonumentoRotaBiker; distanciaKm?: number | null }) {
  const instagram = linkInstagramMonumento(m);
  return <article className="rounded-2xl border border-line bg-surface p-5 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <span className="rounded-xl p-3 bg-elevated text-brand"><Stamp size={22} aria-hidden="true" /></span>
      <span className="flex-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Monumento nº {m.numero}</span>
      {m.situacao === 'em_construcao' && <span className="text-xs font-bold text-ink-muted border border-line-strong rounded-full px-3 py-1">Em construção</span>}
    </div>
    <h3 className="text-xl font-bold leading-snug">{m.nome}</h3>
    <p className="text-sm text-ink-muted">{m.cidade} · {m.uf}{m.pais !== 'Brasil' ? ` · ${m.pais}` : ''}</p>
    {distanciaKm !== null && <p className="text-xs text-ink-muted">Cidade a {distanciaKm.toFixed(0)} km em linha reta</p>}
    <div className="mt-auto pt-4 border-t border-line flex flex-wrap gap-2">
      <LinkExterno href={linkMapaMonumento(m)}>Como chegar</LinkExterno>
      {instagram && <LinkExterno href={instagram}>Instagram</LinkExterno>}
    </div>
  </article>;
}

export function RotaBikerLista({ origem, localizando, localizar }: { origem: GeoPoint | null; localizando: boolean; localizar: () => void }) {
  const [busca, setBusca] = useState('');
  const [pertoDeMim, setPertoDeMim] = useState(false);
  const ordem = pertoDeMim && origem ? 'proximidade' : 'numero';
  const resultados = useMemo(() => buscarMonumentos(MONUMENTOS_ROTA_BIKER, { busca, origem, ordem }), [busca, origem, ordem]);
  const carimbando = MONUMENTOS_ROTA_BIKER.filter(m => m.situacao === 'carimbando').length;
  return <div className="space-y-6">
    <section className="space-y-3" aria-label="Sobre a Rota Biker">
      <p className="text-ink-muted">Pontos com o Monumento ao Cumprimento Biker, onde se carimba o passaporte da Rota Biker. {carimbando} carimbando e {MONUMENTOS_ROTA_BIKER.length - carimbando} em construção.</p>
      <p className="text-sm text-ink-muted border-l-2 border-line-strong pl-3">{AVISO_ROTA_BIKER}</p>
      <LinkExterno href={SITE_ROTA_BIKER}>Site oficial da Rota Biker</LinkExterno>
    </section>
    <div className="flex flex-wrap sm:flex-nowrap gap-3">
      <label className="flex-1 min-w-52 relative"><span className="sr-only">Buscar monumento por nome, número, cidade ou estado</span><Search aria-hidden="true" size={20} className="absolute left-4 top-4 text-ink-muted" /><input className="w-full min-h-14 rounded-xl border border-line-strong bg-elevated px-3 pl-12 text-ink" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Busque um monumento ou cidade" type="search" /></label>
      <button disabled={localizando} aria-pressed={ordem === 'proximidade'} className={`${chip} ${ordem === 'proximidade' ? 'bg-action text-on-action border-action' : 'border-line-strong text-ink'}`} onClick={() => { setPertoDeMim(!pertoDeMim); if (!origem) localizar(); }}><MapPin size={16} aria-hidden="true" />{localizando ? 'Localizando…' : 'Perto de mim'}</button>
    </div>
    <h2 role="status" className="text-xl font-bold">{resultados.length} {resultados.length === 1 ? 'ponto de carimbo' : 'pontos de carimbo'}</h2>
    {resultados.length === 0 && <p className="text-ink-muted">Nenhum monumento encontrado. Experimente outra cidade.</p>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {resultados.map(({ monumento, distanciaKm }) => <CartaoMonumento key={monumento.numero} monumento={monumento} distanciaKm={distanciaKm} />)}
    </div>
  </div>;
}
