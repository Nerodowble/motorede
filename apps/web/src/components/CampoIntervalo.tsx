import React from 'react';
import {
  INTERVAL_MAX_KM,
  INTERVAL_MIN_KM,
  OIL_INTERVAL_SUGGESTIONS,
  type ConsumableCategory,
} from '@motorede/shared';
import { InfoAjuda } from './InfoAjuda';

/**
 * "Troco a cada ___ km". No óleo, atalhos com os números mais comuns — a
 * maioria troca de 1.000 em 1.000 e não deveria precisar digitar.
 */
export const CampoIntervalo: React.FC<{
  category: ConsumableCategory;
  valor: string;
  onChange: (v: string) => void;
  erro?: boolean;
  autoFocus?: boolean;
}> = ({ category, valor, onChange, erro, autoFocus }) => (
  <div className="block">
    <span className="text-[11px] text-ink-muted mb-1.5 flex items-center gap-1.5">
      Troco a cada (km)
      <InfoAjuda chave="intervalo" />
    </span>
    <input
      type="number"
      inputMode="numeric"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      placeholder={category === 'engine_oil' ? 'ex: 1000' : 'veja no manual ou pergunte ao mecânico'}
      className={`w-full px-3 py-2.5 rounded-xl bg-canvas border text-ink text-sm font-mono placeholder:text-ink-faint focus:outline-none focus:border-brand/60 ${
        erro ? 'border-danger' : 'border-line-strong'
      }`}
    />
    {erro && (
      <p className="text-[11px] text-danger mt-1.5">
        Digite um número entre {INTERVAL_MIN_KM.toLocaleString('pt-BR')} e{' '}
        {INTERVAL_MAX_KM.toLocaleString('pt-BR')} km, ou deixe vazio.
      </p>
    )}
    {category === 'engine_oil' && (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {OIL_INTERVAL_SUGGESTIONS.map((km) => (
          <button
            key={km}
            type="button"
            onClick={() => onChange(String(km))}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition ${
              valor === String(km)
                ? 'bg-brand/20 border-brand/60 text-brand-soft'
                : 'bg-elevated border-line-strong text-ink-muted hover:bg-line-strong'
            }`}
          >
            {km.toLocaleString('pt-BR')}
          </button>
        ))}
      </div>
    )}
  </div>
);
