import React, { useState } from 'react';
import {
  Shield,
  Users,
  Store,
  ShieldAlert,
  Radio,
  CheckCircle2,
  XCircle,
  Activity,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react';
import { PartnerShop, SOSAlert } from '@motorede/shared';
import { storageService } from '../services/storage';

interface AdminViewProps {
  sosAlerts: SOSAlert[];
  onResolveSOS: (alertId: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ sosAlerts, onResolveSOS }) => {
  const [shops, setShops] = useState<PartnerShop[]>(storageService.getPartnerShops());

  const handleToggleShopApproval = (shopId: string) => {
    const updated = shops.map((s) => (s.id === shopId ? { ...s, isVerified: !s.isVerified } : s));
    setShops(updated);
    storageService.savePartnerShops(updated);
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto px-4 py-3">
      {/* Admin Header */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Painel Administrativo MotoRede
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                Controle Geral
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Moderação da rede de socorro, validação de parceiros comerciais e métricas operacionais.
            </p>
          </div>
        </div>

        {/* Global Platform KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Pilotos Conectados:</span>
            <p className="text-lg font-black text-white font-mono">1.284</p>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Comboios Ativos:</span>
            <p className="text-lg font-black text-emerald-400 font-mono">38 salas</p>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Taxa Resposta SOS:</span>
            <p className="text-lg font-black text-amber-400 font-mono">98.2%</p>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Oficinas Parceiras:</span>
            <p className="text-lg font-black text-sky-400 font-mono">{shops.length}</p>
          </div>
        </div>
      </div>

      {/* Partner Shops Verification Audit */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-500" />
            Homologação de Oficinas e Motopeças ({shops.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">LGPD Compliance Ativo</span>
        </div>

        <div className="space-y-2.5">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{shop.name}</span>
                  {shop.isVerified ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-medium flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      Homologada
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-medium">
                      Pendente de Aprovação
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  CNPJ: {shop.cnpj} • {shop.address}, {shop.city} • Tel: {shop.phone}
                </p>
                <div className="flex gap-1.5 mt-1.5">
                  {shop.specialties.map((spec, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded font-mono">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleToggleShopApproval(shop.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                  shop.isVerified
                    ? 'bg-red-950/40 text-red-400 border border-red-800 hover:bg-red-900/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {shop.isVerified ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {shop.isVerified ? 'Suspender Credencial' : 'Aprovar Parceiro'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Registered Users & Accounts Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Usuários Cadastrados no Sistema ({storageService.getUsers().length})
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">Autenticação Ativa</span>
        </div>

        <div className="space-y-2">
          {storageService.getUsers().map((u) => (
            <div
              key={u.id}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    u.role === 'partner_shop'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : u.role === 'admin'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {u.role === 'partner_shop' ? '🔧' : u.role === 'admin' ? '🛡️' : '🏍️'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{u.name}</span>
                    <span
                      className={`text-[9px] uppercase font-bold font-mono px-1.5 py-0.2 rounded border ${
                        u.role === 'partner_shop'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : u.role === 'admin'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {u.role === 'partner_shop' ? 'Oficina' : u.role === 'admin' ? 'Admin' : 'Piloto'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {u.email} • {u.phone}
                    {u.motorcycle && ` • ${u.motorcycle.brand} ${u.motorcycle.model} (${u.motorcycle.licensePlate})`}
                    {u.shopName && ` • ${u.shopName}`}
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono self-end sm:self-center">
                Cadastrado em {new Date(u.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community SOS Alerts Audit */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-md">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          Auditoria de Alertas Comunitários
        </h3>

        <div className="space-y-2">
          {sosAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-white">{alert.petitionerName}</span>
                <span className="text-slate-400 ml-2">({alert.locationReference})</span>
                <p className="text-[11px] text-slate-400 mt-0.5">{alert.details}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {alert.status}
                </span>
                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => onResolveSOS(alert.id)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold"
                  >
                    Encerrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
