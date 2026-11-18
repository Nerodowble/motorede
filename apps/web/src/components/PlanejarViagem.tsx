import React from 'react';
import { Calculator, ExternalLink, Fuel, MapPin, Navigation, Wallet, Droplet } from 'lucide-react';
import { formatarReaisRota, type GeoPoint, type Motorcycle } from '@motorede/shared';
import { usePlanoViagem } from '../hooks/usePlanoViagem';

const cartao = 'rounded-2xl border border-line bg-surface p-5 flex flex-col gap-3';
const campo = 'w-full min-h-12 rounded-xl border border-line-strong bg-elevated px-3 text-base text-ink';
const kmTxt = (n: number) => `${Math.round(n).toLocaleString('pt-BR')} km`;
const horas = (h: number) => { const t = Math.round(h * 60); return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')} min`; };

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-ink-muted">{rotulo}</span><span className={forte ? 'font-extrabold text-base' : 'font-semibold'}>{valor}</span>
  </div>;
}

function Titulo({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return <h3 className="flex items-center gap-2 text-lg font-bold"><span className="rounded-xl p-2 bg-elevated text-brand">{icone}</span>{children}</h3>;
}

/** Aba "Viagem" de Rotas: daqui até um destino, com custo, paradas, pedágios e óleo. */
export function PlanejarViagem({ moto, proximaTrocaOleoKm, origem }: { moto: Motorcycle | null; proximaTrocaOleoKm: number | null; origem: GeoPoint | null }) {
  const v = usePlanoViagem(moto, proximaTrocaOleoKm, origem);
  const r = v.resultado;

  return <div className="space-y-4 max-w-2xl">
    <section className={cartao}>
      <Titulo icone={<Navigation size={18} aria-hidden="true" />}>Para onde?</Titulo>
      <label><span className="sr-only">Destino da viagem</span>
        <input className={campo} value={v.busca} onChange={(e) => v.setBusca(e.target.value)} placeholder="Cidade, serra, ponto turístico…" type="search" autoComplete="off" /></label>
      {v.sugestoes.length > 0 && <ul className="divide-y divide-line">
        {v.sugestoes.map((l) => <li key={`${l.nome}${l.detalhe}${l.lat}`}>
          <button type="button" onClick={() => v.escolher(l)} className="w-full min-h-12 flex items-center gap-3 text-left hover:bg-elevated/60 rounded-lg px-1">
            <MapPin size={18} className="text-ink-muted shrink-0" aria-hidden="true" />
            <span><span className="block">{l.nome}</span>{l.detalhe && <span className="block text-xs text-ink-muted">{l.detalhe}</span>}</span>
          </button>
        </li>)}
      </ul>}
      <p className="text-xs text-ink-muted">Saindo da sua localização de agora.</p>
    </section>

    <section className={cartao}>
      <Titulo icone={<Fuel size={18} aria-hidden="true" />}>Moto e combustível</Titulo>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-ink-muted space-y-1"><span>Consumo (km/l)</span><input className={campo} inputMode="decimal" value={v.consumo} onChange={(e) => v.setConsumo(e.target.value)} placeholder="20" /></label>
        <label className="text-xs text-ink-muted space-y-1"><span>Tanque (litros)</span><input className={campo} inputMode="decimal" value={v.tanque} onChange={(e) => v.setTanque(e.target.value)} placeholder="14" /></label>
        <label className="text-xs text-ink-muted space-y-1"><span>Gasolina (R$/l)</span><input className={campo} inputMode="decimal" value={v.preco} onChange={(e) => v.setPreco(e.target.value)} placeholder="6,29" /></label>
      </div>
      <p className="text-xs text-ink-muted">{v.autonomia ? `Autonomia de ${kmTxt(v.autonomia)} com o tanque cheio. Paradas sugeridas quando restar uns 25%.` : 'Com consumo e tanque, o app sugere onde abastecer.'}</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ida ou ida e volta">
        {[false, true].map((iv) => <button key={String(iv)} type="button" aria-pressed={v.idaVolta === iv} onClick={() => v.setIdaVolta(iv)}
          className={`min-h-12 rounded-xl border text-sm font-bold ${v.idaVolta === iv ? 'bg-action text-on-action border-action' : 'border-line-strong text-ink'}`}>{iv ? 'Ida e volta' : 'Só ida'}</button>)}
      </div>
    </section>

    <button type="button" disabled={!v.destino || v.calculando} onClick={() => void v.calcular()}
      className="w-full min-h-14 rounded-xl bg-action text-on-action font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
      <Calculator size={20} aria-hidden="true" />{v.calculando ? 'Calculando…' : 'Calcular viagem'}
    </button>
    {v.erro && <p role="alert" className="text-sm text-danger">{v.erro}</p>}

    {r && <>
      <section className={cartao} aria-live="polite">
        <Titulo icone={<MapPin size={18} aria-hidden="true" />}>{v.destino?.nome}</Titulo>
        <Linha rotulo={v.idaVolta ? 'Distância (ida e volta)' : 'Distância'} valor={kmTxt(r.custo.distanciaKm)} />
        <Linha rotulo="Tempo de estrada (ida, sem paradas)" valor={horas(r.rota.duracaoH)} />
        <Linha rotulo="Gasolina" valor={r.custo.litros === null ? 'Informe o consumo' : `${r.custo.litros.toLocaleString('pt-BR')} l`} />
        <Linha rotulo="Combustível" valor={r.custo.combustivel === null ? 'Informe consumo e preço' : formatarReaisRota(r.custo.combustivel)} />
        <Linha rotulo="Pedágios conhecidos" valor={r.resumo ? formatarReaisRota(r.custo.pedagios) : 'Tabela indisponível'} />
        <div className="border-t border-line pt-3"><Linha rotulo="Total estimado" valor={r.custo.total === null ? '—' : formatarReaisRota(r.custo.total)} forte /></div>
        {v.idaVolta && <p className="text-xs text-ink-muted">A volta é estimada igual à ida.</p>}
      </section>

      {r.oleo && <section className={`${cartao} ${r.oleo.situacao === 'depois' ? '' : 'border-danger/60'}`}>
        <Titulo icone={<Droplet size={18} aria-hidden="true" />}>Troca de óleo</Titulo>
        <p className="text-sm text-ink-muted">{r.oleo.situacao === 'vencida' ? `A troca já passou ${kmTxt(r.oleo.passouKm)}. Troque antes de sair.`
          : r.oleo.situacao === 'na-viagem' ? `A troca vence no km ${r.oleo.kmDaViagem.toLocaleString('pt-BR')} da viagem. Melhor trocar antes de sair.`
          : `A troca fica para depois: sobram ${kmTxt(r.oleo.sobraKm)} quando você voltar.`}</p>
      </section>}

      <section className={cartao}>
        <Titulo icone={<Fuel size={18} aria-hidden="true" />}>Paradas para abastecer</Titulo>
        {r.rota.paradas.length === 0 && <p className="text-sm text-ink-muted">{v.autonomia ? 'A viagem cabe num tanque. Mesmo assim, saia de tanque cheio.' : 'Informe consumo e tanque para ver as paradas.'}</p>}
        <ol className="space-y-3">{r.rota.paradas.map((p, i) => <li key={p.km} className="flex items-center gap-3">
          <span className="w-8 h-8 shrink-0 rounded-lg bg-elevated font-extrabold flex items-center justify-center">{i + 1}</span>
          <span><span className="block">Km {p.km.toLocaleString('pt-BR')}{p.posto ? ` · ${p.posto.nome}` : ''}</span>
            <span className="block text-xs text-ink-muted">{p.posto ? (p.posto.distanciaKm <= 0.5 ? 'Na beira da estrada' : `A ${p.posto.distanciaKm.toLocaleString('pt-BR')} km da estrada`) : 'Nenhum posto no mapa por perto: abasteça no anterior.'}</span></span>
        </li>)}</ol>
        <p className="text-xs text-ink-muted">Postos do OpenStreetMap: confira se estão abertos antes de contar com eles.</p>
      </section>

      <section className={cartao}>
        <Titulo icone={<Wallet size={18} aria-hidden="true" />}>Pedágios no caminho</Titulo>
        {!r.pedagios && <p className="text-sm text-ink-muted">Não foi possível carregar a tabela de pedágios agora.</p>}
        {r.pedagios?.length === 0 && <p className="text-sm text-ink-muted">Nenhuma praça da tabela no trajeto.</p>}
        <ul className="space-y-2">{r.pedagios?.map(({ praca, km }) => <li key={praca.id} className="flex items-center justify-between gap-3 text-sm">
          <span><span className="block">{praca.nome}</span><span className="block text-xs text-ink-muted">{praca.rodovia ?? ''} · km {Math.round(km).toLocaleString('pt-BR')} da viagem</span></span>
          <span className="font-semibold">{praca.situacaoMoto === 'paga' ? formatarReaisRota(praca.motoReais) : praca.situacaoMoto === 'isenta' ? 'Moto isenta' : 'A confirmar'}</span>
        </li>)}</ul>
        <p className="text-xs text-ink-muted">A tabela de pedágios por enquanto só tem praças de São Paulo. Pedágios de outros estados não entram na conta.</p>
      </section>

      <a href={r.link} target="_blank" rel="noopener noreferrer" className="w-full min-h-14 rounded-xl bg-action text-on-action font-bold inline-flex items-center justify-center gap-2">
        Abrir no Google Maps<ExternalLink size={18} aria-hidden="true" />
      </a>
      <p className="text-xs text-ink-muted">Rota calculada pelo openrouteservice (OpenStreetMap). Valores são estimativas: confira antes de sair.</p>
    </>}
  </div>;
}
