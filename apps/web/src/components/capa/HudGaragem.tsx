import React from 'react';
import { Plus } from 'lucide-react';

/**
 * O texto da capa, estilo tela de seleção de jogo de corrida. É desenhado
 * aqui, e não pela IA: marca, modelo, ano e apelido precisam sair exatos.
 *
 * Títulos de jogo em inglês (GARAGE, BIKE SELECT, OWNED) funcionam como ícone;
 * o que é dado vem rotulado em português. Sem barras de "Agility" e afins:
 * seriam números inventados sobre a moto real do piloto.
 *
 * Os textos são `aria-hidden`: a capa inteira é lida como uma imagem com
 * rótulo (`rotuloCapa`). Só o "Dar apelido" fica acessível, por ser botão.
 */

const rotulo = 'font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-muted';

function Campo({ nome, valor, linhas = 1 }: { nome: string; valor: string; linhas?: 1 | 2 }) {
  return (
    <div aria-hidden="true">
      <p className={rotulo}>{nome}</p>
      <p className={`text-xl sm:text-2xl font-extrabold text-ink leading-tight ${linhas === 2 ? 'line-clamp-2' : 'truncate'}`}>
        {valor}
      </p>
    </div>
  );
}

export const HudGaragem: React.FC<{
  brand: string;
  model: string;
  year: number;
  nickname?: string;
  /** Mostra a linha do apelido (no convite ela sai, para caber o botão). */
  comApelido?: boolean;
  onDarApelido?: () => void;
  compacto?: boolean;
}> = ({ brand, model, year, nickname, comApelido = true, onDarApelido, compacto = false }) => (
  <>
    <div className={`absolute ${compacto ? 'top-3 left-3' : 'top-4 left-4'} pointer-events-none`} aria-hidden="true">
      <span className="block w-6 h-[3px] bg-brand mb-2" />
      <p className={rotulo}>Garage</p>
      <p className={`${compacto ? 'text-xl' : 'text-3xl sm:text-4xl'} font-extrabold tracking-tight text-ink leading-none mt-0.5`}>
        BIKE SELECT
      </p>
    </div>

    <div
      className={`absolute ${compacto ? 'top-16 left-3' : 'top-24 sm:top-28 left-4'} w-[52%] sm:w-[44%] border-l-2 border-line-strong pl-3 space-y-3`}
    >
      <Campo nome="Marca" valor={brand} />
      <Campo nome="Modelo" valor={model} linhas={2} />
      <Campo nome="Ano" valor={String(year)} />
      {comApelido && (nickname ? (
        <Campo nome="Apelido" valor={`"${nickname}"`} />
      ) : onDarApelido ? (
        <div>
          <p className={rotulo} aria-hidden="true">Apelido</p>
          <button
            type="button"
            onClick={onDarApelido}
            aria-label="Dar apelido à moto"
            className="relative z-10 min-h-12 -ml-1 px-1 inline-flex items-center gap-1 text-base font-semibold text-ink-muted hover:text-ink"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Dar apelido
          </button>
        </div>
      ) : null)}
    </div>
  </>
);
