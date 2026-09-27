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
  /**
   * Versão grande, com rótulo e alvos de 44px, para o "Mais → Aparência". A
   * compacta segue na tela de login, onde ocupa um canto.
   */
  comRotulos?: boolean;
}

const OPCOES: Array<{ id: ThemeChoice; icone: typeof Sun; titulo: string; rotulo: string }> = [
  { id: 'light', icone: Sun, titulo: 'Tema claro', rotulo: 'Claro' },
  { id: 'dark', icone: Moon, titulo: 'Tema escuro', rotulo: 'Escuro' },
  { id: 'system', icone: Monitor, titulo: 'Seguir o sistema', rotulo: 'Sistema' },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ choice, onChange, comRotulos }) => (
  <div
    role="group"
    aria-label="Tema"
    className={`flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated border border-line ${
      comRotulos ? 'w-full' : ''
    }`}
  >
    {OPCOES.map(({ id, icone: Icone, titulo, rotulo }) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        title={titulo}
        aria-label={titulo}
        aria-pressed={choice === id}
        className={`rounded-md transition ${
          comRotulos
            ? 'flex-1 min-h-11 flex items-center justify-center gap-1.5 text-sm font-semibold'
            : 'p-1.5'
        } ${
          choice === id
            ? 'bg-action text-on-action'
            : comRotulos
              ? 'text-ink-muted hover:text-ink'
              : 'text-ink-faint hover:text-ink-muted'
        }`}
      >
        <Icone className={comRotulos ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        {comRotulos && rotulo}
      </button>
    ))}
  </div>
);
