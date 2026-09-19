import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeChoice } from '../hooks/useTheme';

/**
 * Seletor de tema.
 *
 * Três opções lado a lado em vez de um botão que alterna: com alternância, não
 * dá para voltar a "seguir o sistema" depois de escolher uma vez.
 */

interface ThemeToggleProps {
  choice: ThemeChoice;
  onChange: (choice: ThemeChoice) => void;
}

const OPCOES: Array<{ id: ThemeChoice; icone: typeof Sun; titulo: string }> = [
  { id: 'light', icone: Sun, titulo: 'Tema claro' },
  { id: 'dark', icone: Moon, titulo: 'Tema escuro' },
  { id: 'system', icone: Monitor, titulo: 'Seguir o sistema' },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ choice, onChange }) => (
  <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated border border-line">
    {OPCOES.map(({ id, icone: Icone, titulo }) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        title={titulo}
        aria-label={titulo}
        aria-pressed={choice === id}
        className={`p-1.5 rounded-md transition ${
          choice === id
            ? 'bg-brand text-on-brand'
            : 'text-ink-faint hover:text-ink-muted'
        }`}
      >
        <Icone className="w-3.5 h-3.5" />
      </button>
    ))}
  </div>
);
