import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * Formulário curto que sobe de baixo no celular e centraliza no computador:
 * título, botão de fechar e Salvar. Um só desenho para registrar troca e
 * informar intervalo.
 */
export const FolhaFormulario: React.FC<{
  titulo: string;
  onFechar: () => void;
  onSalvar: (e: React.FormEvent) => void;
  children: React.ReactNode;
}> = ({ titulo, onFechar, onSalvar, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
    <form
      onSubmit={onSalvar}
      className="w-full sm:max-w-sm bg-surface border-t sm:border border-line sm:rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-ink truncate">{titulo}</h3>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="p-1.5 rounded-lg hover:bg-elevated text-ink-muted transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {children}

      <button
        type="submit"
        className="w-full py-3 rounded-xl bg-action hover:opacity-90 text-on-action font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        Salvar
      </button>
    </form>
  </div>
);
