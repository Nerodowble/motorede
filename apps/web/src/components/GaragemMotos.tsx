import React from 'react';
import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from 'lucide-react';
import { nomeDaMoto, type Motorcycle } from '@motorede/shared';

/**
 * Garagem: as motos do piloto, a que está em uso marcada.
 *
 * Clicar numa moto passa a usá-la; o lápis abre a ficha dela; a lixeira apaga
 * a moto com o histórico — com confirmação, porque não tem volta. Mesmo
 * comportamento do app (apps/mobile/src/components/moto/GaragemMotos.tsx).
 */
export const GaragemMotos: React.FC<{
  motos: Motorcycle[];
  ativaId: string;
  aoEscolher: (id: string) => void;
  /** Abre a ficha da moto em uso para editar. */
  aoEditar: () => void;
  aoAdicionar: () => void;
  aoApagar: (id: string) => void;
}> = ({ motos, ativaId, aoEscolher, aoEditar, aoAdicionar, aoApagar }) => {
  const apagar = (m: Motorcycle) => {
    const ok = confirm(
      `Apagar ${nomeDaMoto(m)}?\n\nA moto sai da garagem junto com o histórico de trocas e a capa dela. Não dá para desfazer.`
    );
    if (ok) aoApagar(m.id);
  };

  return (
    <div className="rounded-2xl bg-surface border border-line px-4 pt-3 pb-4">
      <p className="text-xs font-bold text-ink-muted uppercase tracking-wider font-mono mb-1">
        Garagem ({motos.length})
      </p>
      <div className="divide-y divide-line/60">
        {motos.map((m) => {
          const ativa = m.id === ativaId;
          return (
            <div key={m.id} className="flex items-center gap-2 min-h-14">
              <button
                onClick={() => aoEscolher(m.id)}
                disabled={ativa}
                aria-pressed={ativa}
                aria-label={ativa ? `${nomeDaMoto(m)}, em uso` : `Usar ${nomeDaMoto(m)}`}
                className="flex-1 min-w-0 min-h-12 flex items-center gap-3 text-left disabled:cursor-default"
              >
                {ativa ? (
                  <CheckCircle2 className="w-5 h-5 text-action shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink truncate">{nomeDaMoto(m)}</span>
                  <span className="block text-[11px] text-ink-muted">
                    {m.year} · {m.currentKm.toLocaleString('pt-BR')} km{ativa ? ' · em uso' : ''}
                  </span>
                </span>
              </button>
              {ativa && (
                <button
                  onClick={aoEditar}
                  aria-label={`Editar ${nomeDaMoto(m)}`}
                  className="w-12 h-12 rounded-xl bg-elevated hover:bg-line-strong border border-line-strong flex items-center justify-center shrink-0"
                >
                  <Pencil className="w-4 h-4 text-ink" />
                </button>
              )}
              <button
                onClick={() => apagar(m)}
                aria-label={`Apagar ${nomeDaMoto(m)}`}
                className="w-12 h-12 rounded-xl bg-elevated hover:bg-line-strong border border-line-strong flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-4 h-4 text-danger" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={aoAdicionar}
        className="mt-2 w-full min-h-12 rounded-xl bg-elevated hover:bg-line-strong text-ink text-sm font-semibold border border-line-strong transition active:scale-95 flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        Adicionar outra moto
      </button>
    </div>
  );
};
