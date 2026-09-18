import React, { useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Tag,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Filter,
  Settings2,
} from 'lucide-react';
import { Motorcycle, ConsumableStatus, Coupon, ConsumableCategory } from '@motorede/shared';

interface MaintenanceViewProps {
  motorcycle: Motorcycle;
  consumables: ConsumableStatus[];
  coupons: Coupon[];
  onUpdateKm: (newKm: number) => void;
  onOpenEditMotorcycle?: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  motorcycle,
  consumables,
  coupons,
  onUpdateKm,
  onOpenEditMotorcycle,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [activeCouponModal, setActiveCouponModal] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [kmInput, setKmInput] = useState(motorcycle.currentKm.toString());
  const [isEditingKm, setIsEditingKm] = useState(false);

  // Filter coupons
  const filteredCoupons = coupons.filter((c) => {
    if (selectedCategoryFilter === 'all') return true;
    return c.targetCategory === selectedCategoryFilter;
  });

  const handleSaveKm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(kmInput, 10);
    if (!isNaN(val) && val > 0) {
      onUpdateKm(val);
      setIsEditingKm(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-4xl mx-auto px-3 sm:px-4 py-3">
      {/* Top Header Card */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Manutenção Preditiva & Cupons
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {motorcycle.model}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cálculo de desgaste baseado em quilometragem percorrida e tempo decorrido.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <div>
                <span className="text-[10px] text-slate-400 font-mono">Quilometragem Registrada:</span>
                <p className="text-base font-black text-amber-400 font-mono">
                  {motorcycle.currentKm.toLocaleString('pt-BR')} km
                </p>
              </div>
              <button
                onClick={() => setIsEditingKm(!isEditingKm)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
              >
                {isEditingKm ? 'Fechar' : 'Editar KM'}
              </button>
            </div>

            {onOpenEditMotorcycle && (
              <button
                onClick={onOpenEditMotorcycle}
                className="px-3 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-bold border border-amber-500/30 transition flex items-center gap-1.5 active:scale-95"
                title="Ajustar intervalos do manual e dados técnicos"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Intervalos & Dados</span>
              </button>
            )}
          </div>
        </div>

        {isEditingKm && (
          <form onSubmit={handleSaveKm} className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="number"
              value={kmInput}
              onChange={(e) => setKmInput(e.target.value)}
              className="bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-1.5 text-sm text-white font-mono w-44 focus:outline-none"
              placeholder="KM atual"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
            >
              Recalcular Desgaste
            </button>
          </form>
        )}
      </div>

      {/* Predictive Consumables Grid */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Estado de Desgaste dos Consumíveis
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">6 itens monitorados</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {consumables.map((item) => {
            const isCritical = item.status === 'critical';
            const isWarning = item.status === 'warning';

            return (
              <div
                key={item.id}
                className={`rounded-xl p-3.5 border transition ${
                  isCritical
                    ? 'bg-red-950/20 border-red-800/50'
                    : isWarning
                    ? 'bg-amber-950/20 border-amber-800/50'
                    : 'bg-slate-950/70 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">{item.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isCritical
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isCritical ? 'Troca Imediata' : isWarning ? 'Atenção' : 'Em Dia'} • {item.currentWearPercentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden my-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${item.currentWearPercentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/50">
                  <div>
                    <span>Troca recomendada:</span>
                    <p className="font-mono text-slate-200">a cada {item.intervalKm.toLocaleString('pt-BR')} km</p>
                  </div>
                  <div className="text-right">
                    <span>Vida útil restante:</span>
                    <p className={`font-mono font-bold ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ~{item.estimatedRemainingKm.toLocaleString('pt-BR')} km ({item.estimatedRemainingDays > 0 ? `~${item.estimatedRemainingDays} dias` : 'Vencido'})
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LGPD Privacy Guarantee Banner */}
      <div className="rounded-xl bg-slate-900/60 border border-emerald-500/30 p-3.5 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white flex items-center gap-1.5">
            Privacidade e Proteção de Dados (LGPD)
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            Sua localização exata e dados pessoais jamais são compartilhados com as lojas parceiras. A oficina recebe apenas o código do cupom no momento do atendimento presencial.
          </p>
        </div>
      </div>

      {/* Matched Local Coupons & Deals */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Ofertas e Cupons de Oficinas Parceiras
            </h3>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'engine_oil', label: 'Óleo' },
              { id: 'transmission_chain', label: 'Relação' },
              { id: 'brakes', label: 'Freios' },
              { id: 'tires', label: 'Pneus' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Coupons List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 flex flex-col justify-between transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">
                    {coupon.discountPercentage}% DE DESCONTO
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    ~{coupon.shopDistanceKm} km
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white mb-1">{coupon.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{coupon.description}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">{coupon.shopName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Validade: {coupon.validUntil}</p>
                </div>
                <button
                  onClick={() => setActiveCouponModal(coupon)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition active:scale-95 flex items-center gap-1"
                >
                  Resgatar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coupon Modal with QR Code */}
      {activeCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">
              Cupom Validado MotoRede
            </span>
            <h3 className="text-base font-bold text-white mt-2 mb-1">{activeCouponModal.title}</h3>
            <p className="text-xs text-slate-400 mb-4">{activeCouponModal.shopName} • {activeCouponModal.shopCity}</p>

            {/* Generated barcode / QR box */}
            <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-3">
              <div className="font-mono text-slate-950 font-black tracking-widest text-base py-2 px-3 border-2 border-dashed border-slate-900">
                {activeCouponModal.promoCode}
              </div>
              <p className="text-[10px] text-slate-700 mt-1 font-mono">Apresente na oficina no check-in</p>
            </div>

            <p className="text-xs text-slate-300 font-bold mb-4">
              Economia garantida de {activeCouponModal.discountPercentage}% no serviço
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopyCode(activeCouponModal.promoCode)}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Código Copiado!' : 'Copiar Código'}
              </button>
              <button
                onClick={() => setActiveCouponModal(null)}
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
