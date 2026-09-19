import React, { useState } from 'react';
import {
  X,
  Bike,
  Gauge,
  Calendar,
  Fuel,
  Settings2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Motorcycle, ConsumableCategory } from '@motorede/shared';

interface MotorcycleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null quando o piloto ainda não cadastrou: o formulário nasce vazio. */
  motorcycle: Motorcycle | null;
  onSaveMotorcycle: (updated: Motorcycle) => void;
}

export const MotorcycleEditModal: React.FC<MotorcycleEditModalProps> = ({
  isOpen,
  onClose,
  motorcycle,
  onSaveMotorcycle,
}) => {
  const [brand, setBrand] = useState(motorcycle?.brand ?? '');
  const [model, setModel] = useState(motorcycle?.model ?? '');
  const [year, setYear] = useState(motorcycle?.year.toString() ?? String(new Date().getFullYear()));
  const [licensePlate, setLicensePlate] = useState(motorcycle?.licensePlate ?? '');
  const [currentKm, setCurrentKm] = useState(motorcycle?.currentKm.toString() ?? '');
  const [displacementCc, setDisplacementCc] = useState(
    motorcycle?.displacementCc ? motorcycle?.displacementCc.toString() : '500'
  );
  const [fuelType, setFuelType] = useState<'gasoline' | 'flex' | 'ethanol'>(
    motorcycle?.fuelType || 'gasoline'
  );
  const [avgConsumptionKmL, setAvgConsumptionKmL] = useState(
    motorcycle?.avgConsumptionKmL ? motorcycle?.avgConsumptionKmL.toString() : '26.5'
  );
  const [tankCapacityLiters, setTankCapacityLiters] = useState(
    motorcycle?.tankCapacityLiters ? motorcycle?.tankCapacityLiters.toString() : '17.7'
  );
  const [chassisVin, setChassisVin] = useState(motorcycle?.chassisVin || '');
  const [notes, setNotes] = useState(motorcycle?.notes || '');

  // Custom intervals

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedKm = parseInt(currentKm, 10);
    const parsedYear = parseInt(year, 10);

    if (!brand.trim() || !model.trim() || isNaN(parsedKm) || parsedKm < 0) {
      setFeedback('Preencha a Marca, Modelo e Quilometragem Atual válida.');
      return;
    }

    const customIntervals: Partial<Record<ConsumableCategory, number>> = {};

    const updated: Motorcycle = {
      // Sem moto anterior, este é o primeiro cadastro: nasce com id próprio.
      id: motorcycle?.id || `moto-${Date.now()}`,
      ...motorcycle,
      brand: brand.trim(),
      model: model.trim(),
      year: parsedYear || new Date().getFullYear(),
      licensePlate: licensePlate.trim().toUpperCase(),
      currentKm: parsedKm,
      avgKmPerMonth: 0,
      displacementCc: parseInt(displacementCc, 10) || 500,
      fuelType,
      avgConsumptionKmL: parseFloat(avgConsumptionKmL) || 25,
      tankCapacityLiters: parseFloat(tankCapacityLiters) || 15,
      chassisVin: chassisVin.trim() || undefined,
      notes: notes.trim(),
      customIntervals,
      lastKmUpdate: new Date().toISOString(),
    };

    onSaveMotorcycle(updated);
    setFeedback('Dados salvos com sucesso!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-canvas/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Sticky Header */}
        <div className="bg-canvas px-4 sm:px-5 py-3 sm:py-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-soft font-bold shrink-0">
              <Bike className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-1.5 truncate">
                Ficha Técnica & Moto
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand/10 text-brand-soft border border-brand/20 font-bold shrink-0">
                  Personalização
                </span>
              </h2>
              <p className="text-[11px] text-ink-muted truncate">
                Dados reais para médias, consumo e alertas preventivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-elevated transition shrink-0 ml-2"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form id="motorcycle-edit-form" onSubmit={handleSubmit} className="overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5 flex-1 touch-scroll">
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Section 1: Identificação Básica */}
          <div className="rounded-xl bg-canvas/70 border border-line/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-soft uppercase tracking-wider font-mono">
              <Bike className="w-4 h-4" />
              1. Identificação do Veículo
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-ink-muted font-medium mb-1">Marca *</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Honda, Yamaha, BMW, Kawasaki, Triumph..."
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-ink placeholder-ink-faint focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">Modelo Exato *</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: CB 500X, MT-07, F 850 GS, CG 160 Fan..."
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-ink placeholder-ink-faint focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">Ano de Fabricação/Modelo</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Ex: 2023"
                  min="1980"
                  max="2030"
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-ink placeholder-ink-faint focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">Placa (Mercosul ou Antiga)</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="Ex: BRA2E19"
                  maxLength={8}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-ink uppercase placeholder-ink-faint font-mono focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Quilometragem */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-brand uppercase tracking-wider font-mono">
              Quilometragem
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] text-ink-muted mb-1.5 block">Odômetro (km)</span>
                <input
                  type="number"
                  value={currentKm}
                  onChange={(e) => setCurrentKm(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-line-strong text-ink text-sm font-mono focus:outline-none focus:border-brand/60"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-ink-muted mb-1.5 block">Cilindrada (cc)</span>
                <input
                  type="number"
                  value={displacementCc}
                  onChange={(e) => setDisplacementCc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-line-strong text-ink text-sm font-mono focus:outline-none focus:border-brand/60"
                />
              </label>
            </div>
            <p className="text-[10px] text-ink-faint">
              O ritmo em km por mês é medido pelos seus registros de troca — não
              precisa informar.
            </p>
          </section>

          {/* Section 3: Combustível e Autonomia */}
          <div className="rounded-xl bg-canvas/70 border border-line/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-soft uppercase tracking-wider font-mono">
              <Fuel className="w-4 h-4" />
              3. Combustível, Médias e Autonomia
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-ink-muted font-medium mb-1">Combustível</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as any)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                >
                  <option value="gasoline">Gasolina</option>
                  <option value="flex">Flex (Gasolina / Etanol)</option>
                  <option value="ethanol">Etanol</option>
                </select>
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">Consumo Médio Real</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={avgConsumptionKmL}
                    onChange={(e) => setAvgConsumptionKmL(e.target.value)}
                    placeholder="Ex: 26.5"
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 pr-14 text-ink font-mono focus:outline-none focus:border-brand"
                  />
                  <span className="absolute right-3 top-2.5 text-ink-faint font-mono text-[11px]">km/l</span>
                </div>
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">Capacidade do Tanque</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={tankCapacityLiters}
                    onChange={(e) => setTankCapacityLiters(e.target.value)}
                    placeholder="Ex: 17.7"
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 pr-12 text-ink font-mono focus:outline-none focus:border-brand"
                  />
                  <span className="absolute right-3 top-2.5 text-ink-faint font-mono text-[11px]">Litros</span>
                </div>
              </div>
            </div>

            {/* Calculated Autonomy preview */}
            {parseFloat(avgConsumptionKmL) > 0 && parseFloat(tankCapacityLiters) > 0 && (
              <div className="bg-surface/90 rounded-lg p-2.5 flex items-center justify-between text-xs border border-line">
                <span className="text-ink-muted">Autonomia estimada por tanque cheio:</span>
                <span className="font-bold text-brand-soft font-mono text-sm">
                  ~{Math.round(parseFloat(avgConsumptionKmL) * parseFloat(tankCapacityLiters))} km
                </span>
              </div>
            )}
          </div>

          {/* Section 5: Observações e Prontuário */}
          <div className="rounded-xl bg-canvas/70 border border-line/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-soft uppercase tracking-wider font-mono">
              <ShieldCheck className="w-4 h-4" />
              5. Dados Adicionais do Passaporte & Observações
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-ink-muted font-medium mb-1">Número do Chassi / Renavam (Opcional)</label>
                <input
                  type="text"
                  value={chassisVin}
                  onChange={(e) => setChassisVin(e.target.value.toUpperCase())}
                  placeholder="Ex: 9C2NC5100NR000000"
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-ink font-mono placeholder-ink-faint focus:outline-none focus:border-brand"
                />
                <p className="text-[10px] text-ink-faint mt-1">
                  Gravado no Passaporte Digital para comprovação de procedência em caso de venda da moto.
                </p>
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">Notas do Proprietário</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Moto equipada com protetor de motor, afastador de alforges. Utiliza óleo 10W-30 semi-sintético..."
                  rows={2}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-ink placeholder-ink-faint focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Footer Submit Bar */}
        <div className="bg-canvas px-4 sm:px-5 py-3 border-t border-line flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-elevated text-ink-muted hover:bg-line-strong text-xs font-semibold transition active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="motorcycle-edit-form"
            className="px-5 py-2.5 rounded-xl bg-brand hover:opacity-90 text-on-brand text-xs font-bold transition shadow-md active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Salvar Ficha Técnica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
