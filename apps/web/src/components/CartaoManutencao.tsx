import React from 'react';
import { Plus, Pencil } from 'lucide-react';
import {
  describeMeasuredHint,
  describeRemaining,
  type MaintenanceItemStatus,
} from '@motorede/shared';
import { InfoAjuda } from './InfoAjuda';

/**
 * Cartão de um item de manutenção.
 *
 * O número em destaque é o mais simples de entender: "Próxima troca: 11.000
 * km" — o mesmo que a oficina escreve na etiqueta. Embaixo, quanto falta, e
 * de onde saiu a conta (km da troca + intervalo que o piloto informou).
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
  'hora-de-trocar': {
    barra: 'bg-sos',
    texto: 'text-danger',
    rotulo: 'hora de trocar',
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

const km = (n: number) => `${n.toLocaleString('pt-BR')} km`;

export const CartaoManutencao: React.FC<{
  item: MaintenanceItemStatus;
  onInformarIntervalo: () => void;
  onRegistrar: () => void;
}> = ({ item, onInformarIntervalo, onRegistrar }) => {
  const e = STATUS_STYLES[item.status];
  const semRegistro = item.status === 'sem-registro';
  const temConta = item.nextChangeKm !== undefined;
  const progresso =
    item.intervalKm && item.kmSinceLast !== undefined
      ? Math.min(100, Math.round((item.kmSinceLast / item.intervalKm) * 100))
      : 0;
  const dica = describeMeasuredHint(item);

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
          {item.intervalKm !== undefined && ` Você troca a cada ${km(item.intervalKm)}.`}
        </p>
      ) : temConta ? (
        <>
          <div className="h-1.5 rounded-full bg-elevated overflow-hidden mb-2">
            <div className={`h-full ${e.barra} transition-all`} style={{ width: `${progresso}%` }} />
          </div>

          <p className="text-base font-extrabold text-ink flex items-center gap-1.5 flex-wrap">
            Próxima troca: {km(item.nextChangeKm!)}
            <InfoAjuda chave="rodouFaltam" />
          </p>
          <p className={`text-sm font-semibold ${e.texto}`}>{describeRemaining(item.kmRemaining!)}</p>

          <p className="text-[11px] text-ink-muted mt-1.5">
            Trocado com {km(item.last!.km)} em{' '}
            {new Date(item.last!.date).toLocaleDateString('pt-BR')}
            {item.last!.product && ` · ${item.last!.product}`}
          </p>
          <p className="text-[11px] text-ink-muted">
            Você troca a cada {km(item.intervalKm!)} · rodou {km(item.kmSinceLast!)} desde a troca
          </p>
          {dica && <p className="text-[10px] text-ink-faint mt-0.5">{dica}</p>}
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-ink flex items-center gap-1.5 flex-wrap">
            Rodou {km(item.kmSinceLast!)} desde a troca
            <InfoAjuda chave="rodouFaltam" />
          </p>
          <p className="text-[11px] text-ink-muted mt-1">
            Trocado com {km(item.last!.km)} em{' '}
            {new Date(item.last!.date).toLocaleDateString('pt-BR')}. Para saber a próxima troca,
            diga de quantos em quantos km você troca.
          </p>
          {dica && <p className="text-[10px] text-ink-faint mt-0.5">{dica}</p>}
        </>
      )}

      <button
        onClick={onInformarIntervalo}
        className={`mt-2 mb-3 flex items-center gap-1.5 text-[11px] font-semibold transition ${
          item.intervalKm !== undefined
            ? 'text-ink-muted hover:text-ink'
            : 'text-brand-soft hover:opacity-80'
        }`}
      >
        <Pencil className="w-3 h-3" />
        {item.intervalKm !== undefined
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
