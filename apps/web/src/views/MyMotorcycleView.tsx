import React, { useState } from 'react';
import { Plus, Check, X, ChevronDown, FileText, Pencil } from 'lucide-react';
import {
  Motorcycle,
  MaintenanceRecord,
  ConsumableCategory,
  MAINTENANCE_LABELS,
  describeIntervalSource,
  sortByUrgency,
  type MaintenanceItemStatus,
} from '@motorede/shared';
import { MotorcycleEmptyState } from '../components/MotorcycleEmptyState';

/**
 * Minha moto — uma aba só.
 *
 * Antes eram três superfícies para a mesma moto: a Ficha (modal de 17 campos),
 * a aba Manutenção e a aba Passaporte. Elas se sobrepunham de forma concreta —
 * dois formulários para o mesmo evento com campos diferentes, a mesma lista de
 * registros em dois layouts, e o mesmo botão de ficha com dois nomes. O
 * usuário precisava aprender onde ficava o quê antes de conseguir fazer
 * qualquer coisa.
 *
 * O alvo desta tela é uma frase: "troquei o óleo há 900 km, faltam 100 para os
 * 1.000". Ela tem duas metades, e a versão anterior mostrava só a segunda — o
 * `kmSinceLast` era calculado e nunca exibido.
 *
 * Por isso cada cartão mostra as duas, e o botão de registrar fica dentro do
 * cartão, com o verbo do piloto: "Troquei o óleo", não "Registrar".
 */

interface MyMotorcycleViewProps {
  motorcycle: Motorcycle | null;
  maintenance: MaintenanceItemStatus[];
  records: MaintenanceRecord[];
  onAddRecord: (record: Omit<MaintenanceRecord, 'id'>) => void;
  onUpdateKm: (km: number) => void;
  onOpenEditMotorcycle?: () => void;
}

const STATUS_STYLES: Record<
  MaintenanceItemStatus['status'],
  { barra: string; texto: string; rotulo: string; borda: string }
> = {
  vencido: {
    barra: 'bg-red-500',
    texto: 'text-red-400',
    rotulo: 'vencido',
    borda: 'border-red-500/40',
  },
  proximo: {
    barra: 'bg-amber-500',
    texto: 'text-amber-400',
    rotulo: 'se aproximando',
    borda: 'border-amber-500/40',
  },
  ok: {
    barra: 'bg-emerald-500',
    texto: 'text-emerald-400',
    rotulo: 'em dia',
    borda: 'border-slate-800',
  },
  'sem-registro': {
    barra: 'bg-slate-700',
    texto: 'text-slate-500',
    rotulo: '',
    borda: 'border-slate-800',
  },
};

export const MyMotorcycleView: React.FC<MyMotorcycleViewProps> = ({
  motorcycle,
  maintenance,
  records,
  onAddRecord,
  onUpdateKm,
  onOpenEditMotorcycle,
}) => {
  const [registrando, setRegistrando] = useState<ConsumableCategory | null>(null);
  const [km, setKm] = useState('');
  const [data, setData] = useState('');
  const [produto, setProduto] = useState('');
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [tecnicosAberto, setTecnicosAberto] = useState(false);
  const [editandoKm, setEditandoKm] = useState(false);
  const [kmMoto, setKmMoto] = useState('');

  if (!motorcycle) {
    return (
      <MotorcycleEmptyState
        telaInteira
        onCadastrar={onOpenEditMotorcycle}
        motivo="Cadastre marca, modelo e quilometragem para começar a acompanhar as trocas."
      />
    );
  }

  const abrirRegistro = (category: ConsumableCategory) => {
    // O último produto usado é a sugestão mais provável para o próximo.
    const ultimoDaCategoria = [...records]
      .filter((r) => r.category === category)
      .sort((a, b) => b.km - a.km)[0];

    setRegistrando(category);
    setKm(motorcycle.currentKm.toString());
    setData(new Date().toISOString().split('T')[0]);
    setProduto(ultimoDaCategoria?.product ?? '');
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrando) return;

    const kmNum = parseInt(km, 10);
    if (isNaN(kmNum) || kmNum <= 0) return;

    onAddRecord({
      motorcycleId: motorcycle.id,
      date: new Date(data).toISOString(),
      km: kmNum,
      category: registrando,
      title: MAINTENANCE_LABELS[registrando],
      description: '',
      workshopName: '',
      product: produto.trim() || undefined,
      cost: 0,
      hasAttachment: false,
    });

    // A troca aconteceu com a moto nesse km: o odômetro não pode estar atrás.
    if (kmNum > motorcycle.currentKm) onUpdateKm(kmNum);

    setRegistrando(null);
  };

  const salvarKm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(kmMoto, 10);
    if (!isNaN(val) && val > 0) onUpdateKm(val);
    setEditandoKm(false);
  };

  const ordenados = sortByUrgency(maintenance);

  return (
    <div className="space-y-3 pb-28 sm:pb-24 max-w-2xl mx-auto px-3 sm:px-4 py-4">
      {/* Identidade da moto */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-white truncate">
              {motorcycle.brand} {motorcycle.model}
              {motorcycle.licensePlate && (
                <span className="text-slate-500 font-mono text-xs ml-2">
                  {motorcycle.licensePlate}
                </span>
              )}
            </h2>
            {editandoKm ? (
              <form onSubmit={salvarKm} className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={kmMoto}
                  onChange={(e) => setKmMoto(e.target.value)}
                  autoFocus
                  className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500/60"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoKm(false)}
                  className="text-xs text-slate-400 px-2"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setKmMoto(motorcycle.currentKm.toString());
                  setEditandoKm(true);
                }}
                className="text-sm font-mono text-amber-400 mt-1 flex items-center gap-1.5 hover:text-amber-300 transition"
              >
                {motorcycle.currentKm.toLocaleString('pt-BR')} km
                <Pencil className="w-3 h-3 opacity-60" />
              </button>
            )}
          </div>

          {onOpenEditMotorcycle && (
            <button
              onClick={onOpenEditMotorcycle}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition active:scale-95 shrink-0"
            >
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Itens de manutenção, do mais urgente ao sem registro */}
      {ordenados.map((item) => {
        const e = STATUS_STYLES[item.status];
        const semRegistro = item.status === 'sem-registro';
        const progresso =
          item.intervalKm && item.kmSinceLast !== undefined
            ? Math.min(100, Math.round((item.kmSinceLast / item.intervalKm) * 100))
            : 0;

        return (
          <div
            key={item.category}
            className={`rounded-2xl bg-slate-900/80 border p-4 ${e.borda}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                {item.label}
              </h3>
              {e.rotulo && (
                <span className={`text-[10px] font-bold font-mono ${e.texto}`}>
                  {e.rotulo}
                </span>
              )}
            </div>

            {semRegistro ? (
              <p className="text-[11px] text-slate-500 mb-3">Sem registro ainda.</p>
            ) : (
              <>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2">
                  <div
                    className={`h-full ${e.barra} transition-all`}
                    style={{ width: `${progresso}%` }}
                  />
                </div>

                {/* As duas metades da frase: o que passou e o que falta. */}
                <p className="text-sm font-bold text-slate-100">
                  rodou {item.kmSinceLast!.toLocaleString('pt-BR')} km
                  <span className={`font-normal ${e.texto}`}>
                    {item.kmRemaining! > 0
                      ? ` · faltam ${item.kmRemaining!.toLocaleString('pt-BR')}`
                      : ` · ${Math.abs(item.kmRemaining!).toLocaleString('pt-BR')} km além`}
                  </span>
                </p>

                <p className="text-[11px] text-slate-400 mt-1">
                  última: {item.last!.km.toLocaleString('pt-BR')} km ·{' '}
                  {new Date(item.last!.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  })}
                  {item.last!.product && ` · ${item.last!.product}`}
                </p>

                <p className="text-[10px] text-slate-500 mb-3">
                  {describeIntervalSource(
                    item.intervalSource!,
                    item.intervalKm!,
                    item.recordCount
                  )}
                </p>
              </>
            )}

            <button
              onClick={() => abrirRegistro(item.category)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              {semRegistro ? 'Registrar primeira' : `Troquei: ${item.label.toLowerCase()}`}
            </button>
          </div>
        );
      })}

      {/* Histórico */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <button
          onClick={() => setHistoricoAberto(!historicoAberto)}
          className="w-full p-4 flex items-center justify-between gap-2 hover:bg-slate-800/40 transition"
        >
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Histórico completo ({records.length})
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${historicoAberto ? 'rotate-180' : ''}`}
          />
        </button>

        {historicoAberto && (
          <div className="px-4 pb-4">
            {records.length === 0 ? (
              <p className="text-[11px] text-slate-500">Nenhum registro ainda.</p>
            ) : (
              <>
                <div className="divide-y divide-slate-800/60">
                  {[...records]
                    .sort((a, b) => b.km - a.km)
                    .map((r) => (
                      <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-200 truncate">{r.title}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {new Date(r.date).toLocaleDateString('pt-BR')}
                            {r.product && ` · ${r.product}`}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {r.km.toLocaleString('pt-BR')} km
                        </span>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => window.print()}
                  className="mt-3 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Gerar relatório
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Dados técnicos */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <button
          onClick={() => setTecnicosAberto(!tecnicosAberto)}
          className="w-full p-4 flex items-center justify-between gap-2 hover:bg-slate-800/40 transition"
        >
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Dados técnicos e documento
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${tecnicosAberto ? 'rotate-180' : ''}`}
          />
        </button>

        {tecnicosAberto && (
          <div className="px-4 pb-4 space-y-2 text-[11px]">
            {[
              ['Ano', motorcycle.year?.toString()],
              ['Cilindrada', motorcycle.displacementCc && `${motorcycle.displacementCc} cc`],
              ['Tanque', motorcycle.tankCapacityLiters && `${motorcycle.tankCapacityLiters} L`],
              ['Consumo', motorcycle.avgConsumptionKmL && `${motorcycle.avgConsumptionKmL} km/l`],
              ['Chassi', motorcycle.chassisVin],
            ]
              .filter(([, valor]) => Boolean(valor))
              .map(([rotulo, valor]) => (
                <div key={rotulo as string} className="flex justify-between gap-3">
                  <span className="text-slate-500">{rotulo}</span>
                  <span className="text-slate-300 font-mono">{valor}</span>
                </div>
              ))}

            {motorcycle.tankCapacityLiters && motorcycle.avgConsumptionKmL && (
              <div className="flex justify-between gap-3 pt-2 border-t border-slate-800">
                <span className="text-slate-500">Autonomia estimada</span>
                <span className="text-amber-400 font-mono">
                  {Math.round(
                    motorcycle.tankCapacityLiters * motorcycle.avgConsumptionKmL
                  )}{' '}
                  km
                </span>
              </div>
            )}

            {onOpenEditMotorcycle && (
              <button
                onClick={onOpenEditMotorcycle}
                className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Editar dados
              </button>
            )}
          </div>
        )}
      </div>

      {/* Registro: três campos, categoria vinda do cartão */}
      {registrando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={salvar}
            className="w-full sm:max-w-sm bg-slate-900 border-t sm:border border-slate-800 sm:rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-white truncate">
                Troquei: {MAINTENANCE_LABELS[registrando].toLowerCase()}
              </h3>
              <button
                type="button"
                onClick={() => setRegistrando(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block">
              <span className="text-[11px] text-slate-400 mb-1.5 block">
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
                Quando foi
              </span>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60"
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

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Salvar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
