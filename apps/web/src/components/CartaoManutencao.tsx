import React from 'react';
import { Plus, Pencil } from 'lucide-react';
import { describeIntervalSource, type MaintenanceItemStatus } from '@motorede/shared';
import { InfoAjuda } from './InfoAjuda';

/**
 * Cartão de um item de manutenção: as duas metades da frase do piloto
 * ("rodou 900 km · faltam 100"), de onde veio o intervalo e os dois botões —
 * informar o intervalo e registrar a troca.
 */

const STATUS_STYLES: Record<
  MaintenanceItemStatus['status'],
  { barra: string; texto: string; rotulo: string; borda: string }
> = {
  vencido: {
    barra: 'bg-sos',
    texto: 'text-danger',
    rotulo: 'vencido',
    borda: 'border-danger/40',
  },
  proximo: {
    barra: 'bg-warning',
    texto: 'text-warning',
    rotulo: 'se aproximando',
    borda: 'border-warning/40',
  },
  ok: {
    barra: 'bg-live',
    texto: 'text-success',
    rotulo: 'em dia',
    borda: 'border-line',
  },
  'sem-intervalo': {
    barra: 'bg-line-strong',
    texto: 'text-ink-muted',
    rotulo: 'falta o intervalo',
    borda: 'border-line',
  },
  'sem-registro': {
    barra: 'bg-line-strong',
    texto: 'text-ink-faint',
    rotulo: '',
    borda: 'border-line',
  },
};

export const CartaoManutencao: React.FC<{
  item: MaintenanceItemStatus;
  onInformarIntervalo: () => void;
  onRegistrar: () => void;
}> = ({ item, onInformarIntervalo, onRegistrar }) => {
  const e = STATUS_STYLES[item.status];
  const semRegistro = item.status === 'sem-registro';
  const semIntervalo = item.status === 'sem-intervalo';
  const progresso =
    item.intervalKm && item.kmSinceLast !== undefined
      ? Math.min(100, Math.round((item.kmSinceLast / item.intervalKm) * 100))
      : 0;

  return (
    <div className={`rounded-2xl bg-surface/80 border p-4 ${e.borda}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
          {item.label}
        </h3>
        {e.rotulo && (
          <span className={`text-[10px] font-bold font-mono flex items-center gap-1 ${e.texto}`}>
            {e.rotulo}
            <InfoAjuda chave="situacao" />
          </span>
        )}
      </div>

      {semRegistro ? (
        <p className="text-[11px] text-ink-faint">
          Sem registro ainda.
          {item.intervalSource === 'declarado' &&
            ` Você troca a cada ${item.intervalKm!.toLocaleString('pt-BR')} km.`}
        </p>
      ) : semIntervalo ? (
        <>
          <p className="text-sm font-bold text-ink flex items-center gap-1.5">
            rodou {item.kmSinceLast!.toLocaleString('pt-BR')} km desde a última troca
            <InfoAjuda chave="rodouFaltam" />
          </p>
          <p className="text-[11px] text-ink-muted mt-1">
            Para saber quanto falta, diga de quantos em quantos km você troca.
          </p>
        </>
      ) : (
        <>
          <div className="h-1.5 rounded-full bg-elevated overflow-hidden mb-2">
            <div
              className={`h-full ${e.barra} transition-all`}
              style={{ width: `${progresso}%` }}
            />
          </div>

          {/* As duas metades da frase: o que passou e o que falta. */}
          <p className="text-sm font-bold text-ink flex items-center gap-1.5 flex-wrap">
            <span>
              rodou {item.kmSinceLast!.toLocaleString('pt-BR')} km
              <span className={`font-normal ${e.texto}`}>
                {item.kmRemaining! > 0
                  ? ` · faltam ${item.kmRemaining!.toLocaleString('pt-BR')}`
                  : ` · ${Math.abs(item.kmRemaining!).toLocaleString('pt-BR')} km além`}
              </span>
            </span>
            <InfoAjuda chave="rodouFaltam" />
          </p>

          <p className="text-[11px] text-ink-muted mt-1">
            última: {item.last!.km.toLocaleString('pt-BR')} km ·{' '}
            {new Date(item.last!.date).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
            {item.last!.product && ` · ${item.last!.product}`}
          </p>

          <p className="text-[10px] text-ink-faint">
            {describeIntervalSource(
              item.intervalSource!,
              item.intervalKm!,
              item.recordCount
            )}
          </p>
          {item.intervalSource === 'declarado' &&
            item.measuredIntervalKm &&
            item.measuredIntervalKm !== item.intervalKm && (
              <p className="text-[10px] text-ink-faint">
                Nas suas últimas trocas, a média foi ~
                {item.measuredIntervalKm.toLocaleString('pt-BR')} km.
              </p>
            )}
        </>
      )}

      <button
        onClick={onInformarIntervalo}
        className={`mt-2 mb-3 flex items-center gap-1.5 text-[11px] font-semibold transition ${
          item.intervalSource === 'declarado'
            ? 'text-ink-muted hover:text-ink'
            : 'text-brand-soft hover:opacity-80'
        }`}
      >
        <Pencil className="w-3 h-3" />
        {item.intervalSource === 'declarado'
          ? 'Mudar de quantos em quantos km troco'
          : 'Informar de quantos em quantos km troco'}
      </button>

      <button
        onClick={onRegistrar}
        className="w-full py-2.5 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-bold border border-line-strong transition active:scale-95 flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5 text-brand-soft" />
        {semRegistro ? 'Registrar primeira' : `Troquei: ${item.label.toLowerCase()}`}
      </button>
    </div>
  );
};
