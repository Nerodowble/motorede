import React, { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AJUDA_MOTO, type ChaveAjudaMoto } from '@motorede/shared';

/**
 * Botão "i" que explica um campo de cálculo em linguagem simples.
 *
 * Pulsa até o piloto abrir aquela explicação uma vez — o pulso é um convite,
 * não um alarme. Depois de lida, fica parado (e lembrado neste navegador),
 * inclusive nos outros cartões que usam a mesma explicação.
 */

const CHAVE_LIDAS = 'motorede_ajudas_lidas';
const ouvintes = new Set<() => void>();
let lidas: Set<string> = carregar();

function carregar(): Set<string> {
  try {
    const raw = localStorage.getItem(CHAVE_LIDAS);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function marcarLida(chave: string) {
  if (lidas.has(chave)) return;
  lidas = new Set(lidas).add(chave);
  try {
    localStorage.setItem(CHAVE_LIDAS, JSON.stringify([...lidas]));
  } catch {
    // Sem armazenamento, o pulso só volta na próxima visita.
  }
  ouvintes.forEach((f) => f());
}

const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};

export const InfoAjuda: React.FC<{ chave: ChaveAjudaMoto; className?: string }> = ({
  chave,
  className = '',
}) => {
  const [aberta, setAberta] = useState(false);
  const jaLida = useSyncExternalStore(assinar, () => lidas.has(chave));
  const ajuda = AJUDA_MOTO[chave];

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAberta(true);
          marcarLida(chave);
        }}
        aria-label={`Como funciona: ${ajuda.titulo}`}
        className={`relative inline-flex items-center justify-center w-5 h-5 shrink-0 align-middle ${className}`}
      >
        {!jaLida && (
          <span className="absolute inset-0 rounded-full bg-brand/50 animate-ping" />
        )}
        <span className="relative w-4 h-4 rounded-full bg-brand/20 border border-brand/60 text-brand-soft text-[10px] font-bold font-serif italic leading-none flex items-center justify-center">
          i
        </span>
      </button>

      {aberta &&
        createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => {
            e.stopPropagation();
            setAberta(false);
          }}
        >
          <div
            role="dialog"
            aria-label={ajuda.titulo}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-surface border-t sm:border border-line sm:rounded-2xl p-5 space-y-3 text-left normal-case tracking-normal font-sans"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-ink">{ajuda.titulo}</h3>
              <button
                type="button"
                onClick={() => setAberta(false)}
                className="p-1.5 rounded-lg hover:bg-elevated text-ink-muted transition shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {ajuda.paragrafos.map((p) => (
              <p key={p} className="text-sm text-ink-muted leading-relaxed font-normal">
                {p}
              </p>
            ))}
            <button
              type="button"
              onClick={() => setAberta(false)}
              className="w-full py-2.5 rounded-xl bg-action text-on-action text-sm font-bold"
            >
              Entendi
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
