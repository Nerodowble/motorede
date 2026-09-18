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
  motorcycle: Motorcycle;
  onSaveMotorcycle: (updated: Motorcycle) => void;
}

export const MotorcycleEditModal: React.FC<MotorcycleEditModalProps> = ({
  isOpen,
  onClose,
  motorcycle,
  onSaveMotorcycle,
}) => {
  const [brand, setBrand] = useState(motorcycle.brand);
  const [model, setModel] = useState(motorcycle.model);
  const [year, setYear] = useState(motorcycle.year.toString());
  const [licensePlate, setLicensePlate] = useState(motorcycle.licensePlate);
  const [currentKm, setCurrentKm] = useState(motorcycle.currentKm.toString());
  const [avgKmPerMonth, setAvgKmPerMonth] = useState(motorcycle.avgKmPerMonth.toString());
  const [displacementCc, setDisplacementCc] = useState(
    motorcycle.displacementCc ? motorcycle.displacementCc.toString() : '500'
  );
  const [fuelType, setFuelType] = useState<'gasoline' | 'flex' | 'ethanol'>(
    motorcycle.fuelType || 'gasoline'
  );
  const [avgConsumptionKmL, setAvgConsumptionKmL] = useState(
    motorcycle.avgConsumptionKmL ? motorcycle.avgConsumptionKmL.toString() : '26.5'
  );
  const [tankCapacityLiters, setTankCapacityLiters] = useState(
    motorcycle.tankCapacityLiters ? motorcycle.tankCapacityLiters.toString() : '17.7'
  );
  const [ridingStyle, setRidingStyle] = useState<'calm' | 'mixed' | 'aggressive' | 'commuter_heavy'>(
    motorcycle.ridingStyle || 'mixed'
  );
  const [chassisVin, setChassisVin] = useState(motorcycle.chassisVin || '');
  const [notes, setNotes] = useState(motorcycle.notes || '');

  // Custom intervals
  const [customOilInterval, setCustomOilInterval] = useState(
    motorcycle.customIntervals?.engine_oil ? motorcycle.customIntervals.engine_oil.toString() : '5000'
  );
  const [customChainInterval, setCustomChainInterval] = useState(
    motorcycle.customIntervals?.transmission_chain ? motorcycle.customIntervals.transmission_chain.toString() : '25000'
  );
  const [customBrakesInterval, setCustomBrakesInterval] = useState(
    motorcycle.customIntervals?.brakes ? motorcycle.customIntervals.brakes.toString() : '12000'
  );
  const [customTiresInterval, setCustomTiresInterval] = useState(
    motorcycle.customIntervals?.tires ? motorcycle.customIntervals.tires.toString() : '15000'
  );

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedKm = parseInt(currentKm, 10);
    const parsedAvgKm = parseInt(avgKmPerMonth, 10);
    const parsedYear = parseInt(year, 10);

    if (!brand.trim() || !model.trim() || isNaN(parsedKm) || parsedKm < 0) {
      setFeedback('Preencha a Marca, Modelo e Quilometragem Atual válida.');
      return;
    }

    const customIntervals: Partial<Record<ConsumableCategory, number>> = {};
    if (parseInt(customOilInterval, 10)) customIntervals.engine_oil = parseInt(customOilInterval, 10);
    if (parseInt(customChainInterval, 10)) customIntervals.transmission_chain = parseInt(customChainInterval, 10);
    if (parseInt(customBrakesInterval, 10)) customIntervals.brakes = parseInt(customBrakesInterval, 10);
    if (parseInt(customTiresInterval, 10)) customIntervals.tires = parseInt(customTiresInterval, 10);

    const updated: Motorcycle = {
      ...motorcycle,
      brand: brand.trim(),
      model: model.trim(),
      year: parsedYear || new Date().getFullYear(),
      licensePlate: licensePlate.trim().toUpperCase(),
      currentKm: parsedKm,
      avgKmPerMonth: parsedAvgKm > 0 ? parsedAvgKm : 1000,
      displacementCc: parseInt(displacementCc, 10) || 500,
      fuelType,
      avgConsumptionKmL: parseFloat(avgConsumptionKmL) || 25,
      tankCapacityLiters: parseFloat(tankCapacityLiters) || 15,
      ridingStyle,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Sticky Header */}
        <div className="bg-slate-950 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Bike className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
                Ficha Técnica & Moto
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold shrink-0">
                  Personalização
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Dados reais para médias, consumo e alertas preventivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition shrink-0 ml-2"
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
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              <Bike className="w-4 h-4" />
              1. Identificação do Veículo
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Marca *</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Honda, Yamaha, BMW, Kawasaki, Triumph..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Modelo Exato *</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: CB 500X, MT-07, F 850 GS, CG 160 Fan..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Ano de Fabricação/Modelo</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Ex: 2023"
                  min="1980"
                  max="2030"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Placa (Mercosul ou Antiga)</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="Ex: BRA2E19"
                  maxLength={8}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Quilometragem e Rotina de Uso */}
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              <Gauge className="w-4 h-4" />
              2. Quilometragem e Média de Rodagem (Cálculo Preditivo)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Odômetro Atual (KM) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentKm}
                    onChange={(e) => setCurrentKm(e.target.value)}
                    placeholder="Ex: 24850"
                    min="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-amber-400 font-bold font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">KM</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Base de cálculo para os 6 consumíveis monitorados pelo MotoRede.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Sua Média Mensal Estimada (KM/Mês)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={avgKmPerMonth}
                    onChange={(e) => setAvgKmPerMonth(e.target.value)}
                    placeholder="Ex: 1200"
                    min="100"
                    step="50"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-14 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">KM/mês</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Usado para prever a quantidade de dias restantes até as próximas trocas.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Estilo de Pilotagem / Tipo de Uso
                </label>
                <select
                  value={ridingStyle}
                  onChange={(e) => setRidingStyle(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="calm">Suave / Turismo (Desgaste 10% menor)</option>
                  <option value="mixed">Misto Cidade e Rodovia (Padrão)</option>
                  <option value="commuter_heavy">Trânsito Pesado / Entregas diárias (Desgaste 15% maior)</option>
                  <option value="aggressive">Esportivo / Giros Altos (Desgaste 25% maior)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ajusta dinamicamente a taxa de deterioração do óleo, relação e freios.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Cilindrada do Motor (cc)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={displacementCc}
                    onChange={(e) => setDisplacementCc(e.target.value)}
                    placeholder="Ex: 500"
                    min="50"
                    max="2500"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">cc</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Combustível e Autonomia */}
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              <Fuel className="w-4 h-4" />
              3. Combustível, Médias e Autonomia
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Combustível</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="gasoline">Gasolina</option>
                  <option value="flex">Flex (Gasolina / Etanol)</option>
                  <option value="ethanol">Etanol</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Consumo Médio Real</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={avgConsumptionKmL}
                    onChange={(e) => setAvgConsumptionKmL(e.target.value)}
                    placeholder="Ex: 26.5"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-14 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">km/l</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Capacidade do Tanque</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={tankCapacityLiters}
                    onChange={(e) => setTankCapacityLiters(e.target.value)}
                    placeholder="Ex: 17.7"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-12 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">Litros</span>
                </div>
              </div>
            </div>

            {/* Calculated Autonomy preview */}
            {parseFloat(avgConsumptionKmL) > 0 && parseFloat(tankCapacityLiters) > 0 && (
              <div className="bg-slate-900/90 rounded-lg p-2.5 flex items-center justify-between text-xs border border-slate-800">
                <span className="text-slate-400">Autonomia estimada por tanque cheio:</span>
                <span className="font-bold text-amber-400 font-mono text-sm">
                  ~{Math.round(parseFloat(avgConsumptionKmL) * parseFloat(tankCapacityLiters))} km
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Intervalos Customizados de Manutenção (Manual do Proprietário) */}
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                <Settings2 className="w-4 h-4" />
                4. Intervalos de Troca (Manual do Proprietário)
              </div>
              <span className="text-[10px] text-slate-500">Ajuste conforme o manual da sua moto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Troca de Óleo e Filtro (a cada quantos KM?)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={customOilInterval}
                    onChange={(e) => setCustomOilInterval(e.target.value)}
                    placeholder="5000"
                    step="500"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">KM</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Kit Transmissão / Relação (a cada quantos KM?)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={customChainInterval}
                    onChange={(e) => setCustomChainInterval(e.target.value)}
                    placeholder="25000"
                    step="1000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">KM</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Pastilhas de Freio (a cada quantos KM?)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={customBrakesInterval}
                    onChange={(e) => setCustomBrakesInterval(e.target.value)}
                    placeholder="12000"
                    step="1000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">KM</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Pneus (a cada quantos KM?)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={customTiresInterval}
                    onChange={(e) => setCustomTiresInterval(e.target.value)}
                    placeholder="15000"
                    step="1000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-[11px]">KM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Observações e Prontuário */}
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              <ShieldCheck className="w-4 h-4" />
              5. Dados Adicionais do Passaporte & Observações
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Número do Chassi / Renavam (Opcional)</label>
                <input
                  type="text"
                  value={chassisVin}
                  onChange={(e) => setChassisVin(e.target.value.toUpperCase())}
                  placeholder="Ex: 9C2NC5100NR000000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Gravado no Passaporte Digital para comprovação de procedência em caso de venda da moto.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notas do Proprietário</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Moto equipada com protetor de motor, afastador de alforges. Utiliza óleo 10W-30 semi-sintético..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Footer Submit Bar */}
        <div className="bg-slate-950 px-4 sm:px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-750 text-xs font-semibold transition active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="motorcycle-edit-form"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Salvar Ficha Técnica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
