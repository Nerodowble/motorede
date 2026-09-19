import React from 'react';
import { Bike, Plus } from 'lucide-react';

/**
 * Estado de quem ainda não cadastrou a moto.
 *
 * Antes isso não existia: o app gravava uma Honda CB 500X de exemplo na
 * primeira leitura, e o piloto ganhava placa e quilometragem inventadas como se
 * fossem dele. Não havia como distinguir "não tenho moto" de "tenho essa moto".
 *
 * Princípio que orienta o uso: **falta de moto não bloqueia a voz.** O comboio
 * funciona sem cadastro nenhum; só manutenção e passaporte é que dependem.
 */

interface MotorcycleEmptyStateProps {
  onCadastrar?: () => void;
  /** Por que vale cadastrar, dito no contexto da tela onde aparece. */
  motivo?: string;
  /** Ocupa a tela inteira, para abas que não fazem sentido sem moto. */
  telaInteira?: boolean;
}

export const MotorcycleEmptyState: React.FC<MotorcycleEmptyStateProps> = ({
  onCadastrar,
  motivo = 'Leva 30 segundos e serve para acompanhar óleo, relação e pneus.',
  telaInteira = false,
}) => {
  const conteudo = (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
        <Bike className="w-6 h-6" />
      </div>
      <p className="text-sm font-bold text-slate-100 mb-1">
        Você ainda não cadastrou a moto
      </p>
      <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{motivo}</p>

      {onCadastrar && (
        <button
          onClick={onCadastrar}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Cadastrar minha moto
        </button>
      )}
    </div>
  );

  if (!telaInteira) return conteudo;

  return (
    <div className="pb-28 sm:pb-24 max-w-2xl mx-auto px-3 sm:px-4 py-8">{conteudo}</div>
  );
};
