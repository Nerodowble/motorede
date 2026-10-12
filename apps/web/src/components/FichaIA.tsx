import React, { useState } from 'react';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import {
  AVISO_FICHA_IA,
  linhasFichaMoto,
  rotuloUsoFicha,
  type ConsumableCategory,
  type Motorcycle,
  type UsoFicha,
} from '@motorede/shared';
import { useFichaMoto } from '../hooks/useFichaMoto';

/**
 * Ficha do modelo pesquisada por IA, na tela Minha moto.
 *
 * Fechada por padrão: abrir é que dispara a pesquisa (a primeira pessoa com o
 * modelo espera a IA; as seguintes recebem do cache). Nada vai para a moto sem
 * o piloto tocar em "usar", e a tela diz sempre de onde o dado veio — inclusive
 * quando a IA está fora do ar.
 */

const botao =
  'px-3 py-1.5 rounded-lg bg-elevated hover:bg-line-strong border border-line-strong text-ink text-[11px] font-bold transition active:scale-95';

export const FichaIA: React.FC<{
  motorcycle: Motorcycle;
  onSetInterval: (category: ConsumableCategory, km: number | null) => void;
  onSaveMotorcycle: (moto: Motorcycle) => void;
}> = ({ motorcycle, onSetInterval, onSaveMotorcycle }) => {
  const [aberto, setAberto] = useState(false);
  const { situacao, pesquisar } = useFichaMoto(motorcycle.brand, motorcycle.model, motorcycle.year);

  const abrir = () => {
    setAberto(!aberto);
    if (!aberto && situacao.estado === 'ocioso') void pesquisar();
  };

  const usar = (uso: UsoFicha) => {
    if (uso.tipo === 'intervalo') onSetInterval(uso.categoria, uso.km);
    else onSaveMotorcycle({ ...motorcycle, [uso.campo]: uso.valor });
  };

  const tentarDeNovo = (
    <button onClick={() => void pesquisar()} className={botao}>
      Tentar de novo
    </button>
  );

  let corpo: React.ReactNode = null;
  switch (situacao.estado) {
    case 'ocioso':
    case 'pendente':
      corpo = (
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Pesquisando {motorcycle.brand} {motorcycle.model} {motorcycle.year}… pode levar até 1 minuto.
        </p>
      );
      break;
    case 'indisponivel':
      corpo = (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">
            A pesquisa por IA está fora do ar agora. Os dados que você preencheu continuam valendo.
          </p>
          {tentarDeNovo}
        </div>
      );
      break;
    case 'sem-dados':
      corpo = <p className="text-xs text-ink-muted">A IA não encontrou dados confiáveis para este modelo.</p>;
      break;
    case 'falhou':
    case 'demorou':
    case 'erro':
      corpo = (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">
            {situacao.estado === 'erro'
              ? situacao.mensagem
              : situacao.estado === 'demorou'
                ? 'A IA está demorando. Tente de novo daqui a pouco.'
                : 'A IA não conseguiu responder agora. Tente de novo em alguns minutos.'}
          </p>
          {tentarDeNovo}
        </div>
      );
      break;
    case 'pronta': {
      const linhas = linhasFichaMoto(situacao.ficha, motorcycle);
      corpo = (
        <div className="space-y-3">
          {linhas.map((l) => (
            <div key={l.rotulo} className="flex items-start justify-between gap-3 text-[11px]">
              <div className="min-w-0">
                <p className="text-ink-faint">{l.rotulo}</p>
                <p className="text-ink font-mono">{l.valor}</p>
                {l.nota && <p className="text-ink-faint">{l.nota}</p>}
              </div>
              {l.usar && (
                <button onClick={() => usar(l.usar!)} className={`${botao} shrink-0`}>
                  {rotuloUsoFicha(l.usar)}
                </button>
              )}
            </div>
          ))}
          {situacao.ficha.observacao && (
            <p className="text-[11px] text-ink-muted">“{situacao.ficha.observacao}”</p>
          )}
          <p className="text-[11px] text-ink-faint pt-2 border-t border-line">
            {AVISO_FICHA_IA} Pesquisado em {new Date(situacao.em).toLocaleDateString('pt-BR')}.
          </p>
        </div>
      );
      break;
    }
  }

  return (
    <div className="rounded-2xl bg-surface/80 border border-line overflow-hidden">
      <button
        onClick={abrir}
        className="w-full p-4 flex items-center justify-between gap-2 hover:bg-elevated/40 transition"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-ink-muted uppercase tracking-wider font-mono">
          <Sparkles className="w-4 h-4" />
          Ficha do modelo · pesquisada por IA
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-faint transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && <div className="px-4 pb-4">{corpo}</div>}
    </div>
  );
};
