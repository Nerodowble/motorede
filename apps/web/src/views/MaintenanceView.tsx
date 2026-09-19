import React, { useState } from 'react';
import { Wrench, Plus, Check, Calendar, Gauge, X } from 'lucide-react';
import {
  Motorcycle,
  MaintenanceRecord,
  ConsumableCategory,
  MAINTENANCE_LABELS,
  MAINTENANCE_CATEGORIES,
  describeIntervalSource,
  type MaintenanceItemStatus,
} from '@motorede/shared';

/**
 * Manutenção como etiqueta de troca de óleo.
 *
 * O modelo mental é o adesivo que a oficina cola no vidro: registra-se o que
 * foi feito, com qual produto e em que quilometragem. É um hábito que já
 * existe, e por isso tem chance de ser mantido.
 *
 * A versão anterior fazia o contrário — pedia que o piloto mantivesse
 * intervalos e datas de seis itens sempre atualizados. Ninguém faz isso, e a
 * prova é que o protótipo precisou preencher tudo com valores fictícios.
 *
 * Aqui nada é afirmado sem base. Item sem registro não tem barra, porcentagem
 * nem alerta: tem um convite para registrar. E toda previsão diz de onde veio,
 * porque "observei isso em você" e "esse é o número do manual" são coisas
 * diferentes.
 */

interface MaintenanceViewProps {
  motorcycle: Motorcycle;
  maintenance: MaintenanceItemStatus[];
  records: MaintenanceRecord[];
  onAddRecord: (record: Omit<MaintenanceRecord, 'id'>) => void;
  onOpenEditMotorcycle?: () => void;
}

const STATUS_STYLES: Record<
  MaintenanceItemStatus['status'],
  { border: string; text: string; label: string }
> = {
  'sem-registro': { border: 'border-slate-800', text: 'text-slate-500', label: '' },
  ok: { border: 'border-slate-800', text: 'text-emerald-400', label: 'em dia' },
  proximo: { border: 'border-amber-500/40', text: 'text-amber-400', label: 'se aproximando' },
  vencido: { border: 'border-red-500/40', text: 'text-red-400', label: 'vencido' },
};

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  motorcycle,
  maintenance,
  records,
  onAddRecord,
  onOpenEditMotorcycle,
}) => {
  const [registrando, setRegistrando] = useState<ConsumableCategory | null>(null);
  const [km, setKm] = useState('');
  const [produto, setProduto] = useState('');
  const [intervalo, setIntervalo] = useState('');
  const [oficina, setOficina] = useState('');

  const abrirRegistro = (category: ConsumableCategory) => {
    setRegistrando(category);
    setKm(motorcycle.currentKm.toString());
    setProduto('');
    setIntervalo('');
    setOficina('');
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrando) return;

    const kmNum = parseInt(km, 10);
    if (isNaN(kmNum) || kmNum <= 0) return;

    onAddRecord({
      motorcycleId: motorcycle.id,
      date: new Date().toISOString(),
      km: kmNum,
      category: registrando,
      title: MAINTENANCE_LABELS[registrando],
      description: '',
      workshopName: oficina.trim() || 'Feito pelo piloto',
      product: produto.trim() || undefined,
      declaredIntervalKm: intervalo ? parseInt(intervalo, 10) : undefined,
      cost: 0,
      hasAttachment: false,
    });

    setRegistrando(null);
  };

  const semRegistroNenhum = records.length === 0;

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-2xl mx-auto px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-white">Manutenção</h2>
          <p className="text-[11px] text-slate-400 truncate">
            {motorcycle.brand} {motorcycle.model} ·{' '}
            {motorcycle.currentKm.toLocaleString('pt-BR')} km
          </p>
        </div>
        {onOpenEditMotorcycle && (
          <button
            onClick={onOpenEditMotorcycle}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95 shrink-0"
          >
            Ficha
          </button>
        )}
      </div>

      {semRegistroNenhum && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
          <p className="text-xs font-bold text-amber-300 mb-1">
            Comece registrando uma troca
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Funciona como a etiqueta que colam no vidro: anote o que trocou, com qual
            produto e em quantos km. A partir do terceiro registro o app aprende o seu
            intervalo real e passa a avisar sozinho.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {maintenance.map((item) => {
          const estilo = STATUS_STYLES[item.status];
          const semRegistro = item.status === 'sem-registro';

          return (
            <div
              key={item.category}
              className={`rounded-2xl bg-slate-900/80 border p-4 ${estilo.border}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-100">{item.label}</h3>
                    {estilo.label && (
                      <span className={`text-[10px] font-bold font-mono ${estilo.text}`}>
                        {estilo.label.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {semRegistro ? (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Sem registro. Assim que você anotar uma troca, o acompanhamento
                      começa.
                    </p>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-[11px] text-slate-400">
                        Última:{' '}
                        <span className="font-mono text-slate-300">
                          {item.last!.km.toLocaleString('pt-BR')} km
                        </span>
                        {' · '}
                        {new Date(item.last!.date).toLocaleDateString('pt-BR')}
                        {item.last!.product && (
                          <>
                            {' · '}
                            <span className="text-slate-300">{item.last!.product}</span>
                          </>
                        )}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        {describeIntervalSource(
                          item.intervalSource!,
                          item.intervalKm!,
                          item.recordCount
                        )}
                      </p>

                      <p className={`text-[11px] font-mono font-bold ${estilo.text}`}>
                        {item.kmRemaining! <= 0
                          ? `${Math.abs(item.kmRemaining!).toLocaleString('pt-BR')} km além do intervalo`
                          : `faltam ${item.kmRemaining!.toLocaleString('pt-BR')} km`}
                        {item.estimatedDate && (
                          <span className="text-slate-500 font-normal">
                            {' · por volta de '}
                            {new Date(item.estimatedDate).toLocaleDateString('pt-BR', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => abrirRegistro(item.category)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  Registrar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registro de troca */}
      {registrando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <form
            onSubmit={salvar}
            className="w-full sm:max-w-sm bg-slate-900 border-t sm:border border-slate-800 sm:rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
                <h3 className="text-sm font-extrabold text-white truncate">
                  {MAINTENANCE_LABELS[registrando]}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRegistrando(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1.5">
                <Gauge className="w-3.5 h-3.5" />
                Quilometragem na troca
              </span>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500/60"
              />
            </label>

            <label className="block">
              <span className="text-[11px] text-slate-400 mb-1.5 block">
                Produto usado <span className="text-slate-600">(opcional)</span>
              </span>
              <input
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                placeholder="ex: Motul 5100 10W40"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60"
              />
            </label>

            <label className="block">
              <span className="text-[11px] text-slate-400 mb-1.5 block">
                Intervalo que você usa <span className="text-slate-600">(opcional)</span>
              </span>
              <input
                type="number"
                value={intervalo}
                onChange={(e) => setIntervalo(e.target.value)}
                placeholder="ex: 5000"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm font-mono placeholder:text-slate-600 placeholder:font-sans focus:outline-none focus:border-amber-500/60"
              />
              <span className="text-[10px] text-slate-600 mt-1 block">
                A partir do terceiro registro, o intervalo real que observarmos em você
                passa a valer sobre este.
              </span>
            </label>

            <label className="block">
              <span className="text-[11px] text-slate-400 mb-1.5 block">
                Onde foi feito <span className="text-slate-600">(opcional)</span>
              </span>
              <input
                value={oficina}
                onChange={(e) => setOficina(e.target.value)}
                placeholder="Feito pelo piloto"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60"
              />
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Salvar registro
            </button>
          </form>
        </div>
      )}

      {records.length > 0 && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Histórico ({records.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-800/60">
            {[...records]
              .sort((a, b) => b.km - a.km)
              .slice(0, 8)
              .map((r) => (
                <div key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200 truncate">{r.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {r.product || r.workshopName}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {r.km.toLocaleString('pt-BR')} km
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
