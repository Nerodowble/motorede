import React, { useState } from 'react';
import {
  Store,
  Tag,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  QrCode,
  Calendar,
  BookOpenCheck,
  Search,
} from 'lucide-react';
import { Coupon, ConsumableCategory, PartnerShop, UserProfile } from '@motorede/shared';

interface PartnerShopViewProps {
  currentUser?: UserProfile | null;
  coupons: Coupon[];
  onAddCoupon: (coupon: Omit<Coupon, 'id' | 'shopId' | 'shopName' | 'shopCity' | 'shopDistanceKm'>) => void;
  onValidateCoupon: (code: string) => boolean;
}

export const PartnerShopView: React.FC<PartnerShopViewProps> = ({
  currentUser,
  coupons,
  onAddCoupon,
  onValidateCoupon,
}) => {
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);

  // New coupon state
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('15');
  const [targetCategory, setTargetCategory] = useState<ConsumableCategory>('engine_oil');
  const [promoCode, setPromoCode] = useState('');
  const [validUntil, setValidUntil] = useState('31/12/2026');

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;

    const isValid = onValidateCoupon(couponCodeInput.trim());
    if (isValid) {
      setValidationResult({
        success: true,
        message: `Cupom "${couponCodeInput.toUpperCase()}" validado com sucesso! Desconto liberado na ordem de serviço.`,
      });
      setCouponCodeInput('');
    } else {
      setValidationResult({
        success: false,
        message: `Cupom "${couponCodeInput.toUpperCase()}" inválido ou já expirado.`,
      });
    }
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !promoCode.trim()) return;

    onAddCoupon({
      title: title.trim(),
      description: description.trim() || 'Desconto exclusivo para motociclistas da comunidade MotoRede.',
      discountPercentage: parseInt(discountPercentage, 10) || 10,
      targetCategory,
      promoCode: promoCode.trim().toUpperCase(),
      validUntil,
    });

    setShowAddCoupon(false);
    setTitle('');
    setDescription('');
    setPromoCode('');
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto px-4 py-3">
      {/* Workshop Header */}
      <div className="rounded-2xl bg-gradient-to-b from-surface to-canvas border border-line p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-soft shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
                  Painel da Oficina Parceira
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {currentUser?.shopName || 'MotoTech Garage'}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                {currentUser?.name && `Responsável: ${currentUser.name} • `}
                {currentUser?.city || 'São Paulo - SP'}
                {currentUser?.cnpj && ` • CNPJ: ${currentUser.cnpj}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddCoupon(!showAddCoupon)}
            className="px-3.5 py-2 rounded-xl bg-brand hover:opacity-90 text-on-brand font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Criar Nova Oferta
          </button>
        </div>
      </div>

      {/* Coupon Redemption Terminal */}
      <div className="rounded-2xl bg-surface/90 border border-brand/30 p-5 shadow-lg">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-2 mb-3">
          <QrCode className="w-4 h-4 text-brand" />
          Terminal de Validação de Cupons (Balcão)
        </h3>

        <form onSubmit={handleValidate} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={couponCodeInput}
              onChange={(e) => setCouponCodeInput(e.target.value)}
              placeholder="Digite ou escaneie o código (Ex: MOTOREDE-RELACAO18)"
              className="w-full bg-canvas border border-line-strong rounded-xl px-4 py-2.5 text-sm font-mono text-ink uppercase placeholder:text-ink-faint focus:outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-brand hover:opacity-90 text-on-brand font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            Validar Cupom
          </button>
        </form>

        {validationResult && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 ${
              validationResult.success
                ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border border-red-800 text-red-300'
            }`}
          >
            {validationResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{validationResult.message}</span>
          </div>
        )}
      </div>

      {/* LGPD Compliance Reminder */}
      <div className="rounded-xl bg-surface/60 border border-line p-3.5 text-xs text-ink-muted flex items-start gap-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-ink">Compliance LGPD para Oficinas:</span>
          <p className="mt-0.5 leading-relaxed">
            As ofertas são enviadas aos motociclistas pelo aplicativo com base no desgaste de peças calculado no celular do piloto. A oficina não tem acesso a dados de GPS ou identificação pessoal prévia dos clientes.
          </p>
        </div>
      </div>

      {/* Create Coupon Modal/Panel */}
      {showAddCoupon && (
        <div className="rounded-2xl bg-surface/90 border border-line p-5 shadow-lg animate-in fade-in">
          <h3 className="text-sm font-extrabold text-ink mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" />
            Cadastrar Nova Promoção Direcionada
          </h3>

          <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
            <div>
              <label className="block text-ink-muted font-bold mb-1">Título da Oferta</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: 20% OFF na troca de Kit Relação Did/KMC com instalação inclusa"
                className="w-full bg-canvas border border-line-strong rounded-lg p-2.5 text-ink focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-ink-muted font-bold mb-1">Categoria de Desgaste</label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value as ConsumableCategory)}
                  className="w-full bg-canvas border border-line-strong rounded-lg p-2.5 text-ink focus:outline-none focus:border-brand"
                >
                  <option value="engine_oil">Óleo do Motor</option>
                  <option value="transmission_chain">Kit Transmissão / Relação</option>
                  <option value="brakes">Pastilhas e Freios</option>
                  <option value="tires">Pneus e Câmaras</option>
                  <option value="filters_sparkplug">Filtros & Velas</option>
                </select>
              </div>

              <div>
                <label className="block text-ink-muted font-bold mb-1">Desconto (%)</label>
                <input
                  type="number"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  min="1"
                  max="90"
                  className="w-full bg-canvas border border-line-strong rounded-lg p-2.5 text-ink font-mono focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-ink-muted font-bold mb-1">Código Promocional</label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Ex: MOTOTECH-PNEUS15"
                  className="w-full bg-canvas border border-line-strong rounded-lg p-2.5 text-ink font-mono uppercase focus:outline-none focus:border-brand"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowAddCoupon(false)}
                className="px-3 py-1.5 rounded-lg bg-elevated text-ink-muted hover:text-ink"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-brand text-on-brand font-bold hover:opacity-90"
              >
                Publicar Oferta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Workshop Offers */}
      <div className="rounded-2xl bg-surface/80 border border-line p-4 shadow-md">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-brand" />
          Cupons Publicados na Rede MotoRede ({coupons.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-canvas/80 border border-line rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-brand-soft px-2 py-0.5 rounded bg-brand/10 border border-brand/20">
                  {coupon.promoCode}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {coupon.discountPercentage}% OFF
                </span>
              </div>
              <h4 className="text-xs font-bold text-ink mb-1">{coupon.title}</h4>
              <p className="text-[11px] text-ink-muted">{coupon.description}</p>
              <div className="mt-2 pt-2 border-t border-line/80 text-[10px] text-ink-faint font-mono flex items-center justify-between">
                <span>Válido até: {coupon.validUntil}</span>
                <span className="text-ink-muted">Ativo na região</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
