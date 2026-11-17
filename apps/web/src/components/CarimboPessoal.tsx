import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import {
  AVISO_CARIMBO_PESSOAL, avaliarCarimbo, explicarRecusa,
  type CarimboPessoal, type MonumentoRotaBiker,
} from '@motorede/shared';
import { apagarFoto, guardarFoto, lerFoto, posicaoAtual, reduzirFoto, type PosicaoAtual } from '../services/carimbos';

/** Depois disso a posição conferida "envelhece" e é preciso conferir de novo. */
const POSICAO_VALE_MS = 5 * 60 * 1000;

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const botao = 'min-h-12 px-4 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-bold transition-colors';

/** URL temporária da foto guardada no IndexedDB. */
function useFoto(chave: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!chave) return;
    let viva = true;
    let criada: string | null = null;
    void lerFoto(chave).then((blob) => {
      if (!viva || !blob) return;
      criada = URL.createObjectURL(blob);
      setUrl(criada);
    }).catch(() => undefined);
    return () => { viva = false; if (criada) URL.revokeObjectURL(criada); };
  }, [chave]);
  return url;
}

/**
 * Carimbo dentro do card do monumento.
 *
 * Dois passos de propósito: no iPhone o Safari só abre a câmera quando o toque
 * é DIRETO no campo de foto. Se a câmera fosse aberta depois de esperar o GPS,
 * o gesto já teria expirado e nada aconteceria.
 */
export function BlocoCarimbo({ monumento: m, ultimo, total, adicionar, remover }: {
  monumento: MonumentoRotaBiker;
  ultimo: CarimboPessoal | undefined;
  total: number;
  adicionar: (c: CarimboPessoal) => void;
  remover: (c: CarimboPessoal) => void;
}) {
  const [etapa, setEtapa] = useState<'livre' | 'localizando' | 'foto' | 'salvando'>('livre');
  const [posicao, setPosicao] = useState<(PosicaoAtual & { distanciaKm: number }) | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [aberto, setAberto] = useState(false);
  const miniatura = useFoto(ultimo?.foto);

  const conferirLocal = async () => {
    setMensagem(''); setEtapa('localizando');
    try {
      const p = await posicaoAtual();
      const a = avaliarCarimbo(m, p, p.precisaoM);
      if (!a.pode) { setMensagem(explicarRecusa(a, m)); setEtapa('livre'); return; }
      setPosicao({ ...p, distanciaKm: a.distanciaKm }); setEtapa('foto');
    } catch (e) {
      setMensagem((e as Error).message === 'negado'
        ? 'Permita a localização para este site: o carimbo usa a sua posição de agora.'
        : 'Não foi possível obter sua posição. Confira o GPS e tente de novo.');
      setEtapa('livre');
    }
  };

  const fotoEscolhida = async (arquivo: File | undefined) => {
    if (!arquivo || !posicao) return;
    if (Date.now() - posicao.em > POSICAO_VALE_MS) { setMensagem('Passou tempo demais. Confira o local de novo.'); setEtapa('livre'); return; }
    setEtapa('salvando');
    try {
      const id = `carimbo-${m.numero}-${Date.now()}`;
      await guardarFoto(id, await reduzirFoto(arquivo));
      adicionar({ id, monumento: m.numero, em: new Date().toISOString(), lat: posicao.lat, lng: posicao.lng,
        precisaoM: posicao.precisaoM, distanciaKm: posicao.distanciaKm, foto: id });
      setMensagem('Carimbado! Ficou registrado nos seus carimbos, com a foto e o local de agora.');
    } catch {
      setMensagem('Não foi possível guardar a foto neste aparelho. Tente de novo.');
    }
    setPosicao(null); setEtapa('livre');
  };

  return <div className="flex flex-col gap-3">
    {ultimo && <button type="button" onClick={() => setAberto(true)} className="flex items-center gap-3 text-left min-h-14 rounded-xl hover:bg-elevated/60">
      {miniatura ? <img src={miniatura} alt="" className="w-14 h-14 rounded-xl object-cover bg-elevated" /> : <span className="w-14 h-14 rounded-xl bg-elevated" />}
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">Você esteve aqui em {data(ultimo.em)}</span>
        <span className="block text-xs text-ink-muted">{total > 1 ? `${total} carimbos · ` : ''}Toque para ver a foto</span>
      </span>
    </button>}

    {etapa === 'foto' || etapa === 'salvando' ? <>
      <p className="text-sm text-ink">Você está no lugar certo. Agora tire a foto.</p>
      <label className={`${botao} bg-action text-on-action cursor-pointer ${etapa === 'salvando' ? 'opacity-60 pointer-events-none' : ''}`}>
        <Camera size={18} aria-hidden="true" />{etapa === 'salvando' ? 'Guardando…' : 'Tirar a foto'}
        <input type="file" accept="image/*" capture="environment" className="sr-only"
          onChange={(e) => { void fotoEscolhida(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      <button type="button" onClick={() => { setPosicao(null); setEtapa('livre'); }} className={`${botao} text-ink-muted`}>Cancelar</button>
    </> : <button type="button" disabled={etapa === 'localizando'} onClick={() => void conferirLocal()}
      className={`${botao} ${ultimo ? 'border border-line-strong text-ink hover:bg-elevated' : 'bg-action text-on-action'} disabled:opacity-60`}>
      <Camera size={18} aria-hidden="true" />{etapa === 'localizando' ? 'Conferindo o local…' : ultimo ? 'Carimbar de novo' : 'Carimbar (pessoal)'}
    </button>}

    {mensagem && <p role="status" className="text-sm text-ink-muted">{mensagem}</p>}
    {ultimo && aberto && <FotoCarimbo carimbo={ultimo} monumento={m} url={miniatura} fechar={() => setAberto(false)}
      apagar={() => { void apagarFoto(ultimo.foto).catch(() => undefined); remover(ultimo); setAberto(false); }} />}
  </div>;
}

function FotoCarimbo({ carimbo: c, monumento: m, url, fechar, apagar }: {
  carimbo: CarimboPessoal; monumento: MonumentoRotaBiker; url: string | null; fechar: () => void; apagar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const distancia = c.distanciaKm < 1 ? `${Math.round(c.distanciaKm * 1000)} m` : `${c.distanciaKm.toFixed(1).replace('.', ',')} km`;
  return <dialog ref={ref} onClose={fechar} aria-label={`Carimbo pessoal em ${m.nome}`}
    className="m-auto w-[min(100vw-2rem,32rem)] max-h-[90dvh] rounded-2xl bg-surface text-ink p-0 backdrop:bg-black/70">
    <div className="p-5 flex flex-col gap-4 pb-safe">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Carimbo pessoal · nº {m.numero}</p>
          <h3 className="text-xl font-bold">{m.nome}</h3>
        </div>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl hover:bg-elevated"><X size={20} /></button>
      </div>
      {url && <img src={url} alt={`Sua foto em ${m.nome}`} className="w-full rounded-xl object-cover bg-elevated" />}
      <p className="text-sm text-ink-muted">{data(c.em)} às {hora(c.em)} · a {distancia} do monumento</p>
      <p className="text-xs text-ink-muted border-l-2 border-line-strong pl-3">{AVISO_CARIMBO_PESSOAL}</p>
      <button type="button" onClick={() => { if (window.confirm('Apagar este carimbo? Apaga a foto e o registro deste dia. Não dá para desfazer.')) apagar(); }}
        className={`${botao} border border-line-strong text-danger hover:bg-elevated`}><Trash2 size={18} aria-hidden="true" />Apagar este carimbo</button>
    </div>
  </dialog>;
}
