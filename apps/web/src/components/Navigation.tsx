import React, { useState } from 'react';
import {
  LayoutDashboard,
  Radio,
  ShieldAlert,
  Wrench,
  BookOpenCheck,
  Stethoscope,
  Store,
  Shield,
  MoreHorizontal,
  X,
  Settings2,
  Smartphone,
  ChevronRight,
  Bike,
} from 'lucide-react';
import { UserRole } from '@motorede/shared';

export type ActiveTab =
  | 'dashboard'
  | 'convoy'
  | 'sos'
  | 'motorcycle'
  | 'diagnostic'
  | 'partner_shop'
  | 'admin';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  userRole: UserRole;
  activeSOSCount: number;
  isVoiceActive: boolean;
  onOpenEditMotorcycle?: () => void;
  onOpenLockscreenModal?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  userRole,
  activeSOSCount,
  isVoiceActive,
  onOpenEditMotorcycle,
  onOpenLockscreenModal,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Desktop full navigation items
  const getAllNavItems = () => {
    if (userRole === 'partner_shop') {
      return [
        { id: 'partner_shop' as ActiveTab, label: 'Painel da Oficina', icon: Store },
        { id: 'motorcycle' as ActiveTab, label: 'Minha moto', icon: Bike },
        { id: 'sos' as ActiveTab, label: 'Rede SOS', icon: ShieldAlert, badge: activeSOSCount },
        { id: 'dashboard' as ActiveTab, label: 'Visão Piloto', icon: LayoutDashboard },
      ];
    }

    if (userRole === 'admin') {
      return [
        { id: 'admin' as ActiveTab, label: 'Painel Admin', icon: Shield },
        { id: 'sos' as ActiveTab, label: 'Central SOS', icon: ShieldAlert, badge: activeSOSCount },
        { id: 'diagnostic' as ActiveTab, label: 'Moderação Triagem', icon: Stethoscope },
        { id: 'dashboard' as ActiveTab, label: 'App Piloto', icon: LayoutDashboard },
      ];
    }

    // Default: Rider
    return [
      { id: 'dashboard' as ActiveTab, label: 'Painel', icon: LayoutDashboard },
      { id: 'convoy' as ActiveTab, label: 'Comboio', icon: Radio, pulse: isVoiceActive },
      { id: 'sos' as ActiveTab, label: 'Rede SOS', icon: ShieldAlert, badge: activeSOSCount, alertColor: true },
      { id: 'motorcycle' as ActiveTab, label: 'Minha moto', icon: Bike },
      { id: 'diagnostic' as ActiveTab, label: 'Diagnóstico', icon: Stethoscope },
    ];
  };

  const allNavItems = getAllNavItems();
  const isMoreActive = userRole === 'rider' && (activeTab === 'motorcycle' || activeTab === 'diagnostic');

  const handleMobileTabSelect = (tab: ActiveTab) => {
    onTabChange(tab);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* Mobile "Mais" Bottom Sheet Drawer */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setIsMoreMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto pb-safe">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bike className="w-4 h-4 text-amber-400" />
                  Módulos & Ferramentas MotoRede
                </h3>
                <p className="text-xs text-slate-400">Acesso rápido para pilotagem e manutenção</p>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 active:scale-95"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of extra features */}
            <div className="space-y-2">
              <button
                onClick={() => handleMobileTabSelect('motorcycle')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition active:scale-98 ${
                  activeTab === 'motorcycle'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <BookOpenCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Passaporte & Ficha da Moto</p>
                    <p className="text-xs text-slate-400">Histórico de revisões e selo de procedência</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => handleMobileTabSelect('diagnostic')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition active:scale-98 ${
                  activeTab === 'diagnostic'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Diagnóstico Mecânico na Estrada</p>
                    <p className="text-xs text-slate-400">Triagem de sintomas passo a passo</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {onOpenEditMotorcycle && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenEditMotorcycle();
                  }}
                  className="w-full p-3.5 rounded-xl border bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-800 flex items-center justify-between transition active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">Editar Ficha Técnica da Moto</p>
                      <p className="text-xs text-slate-400">Cadastrar cilindrada, tanque, estilo e intervalos</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              )}

              {onOpenLockscreenModal && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenLockscreenModal();
                  }}
                  className="w-full p-3.5 rounded-xl border bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-800 flex items-center justify-between transition active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">Simulador de Tela Bloqueada</p>
                      <p className="text-xs text-slate-400">Testar áudio de rádio e atalhos em segundo plano</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 pb-safe shadow-lg">
        {/* DESKTOP BAR (md and above) - All Tabs visible */}
        <div className="hidden md:block max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex flex-col items-center justify-center min-w-[72px] py-1.5 px-3 rounded-xl transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'text-amber-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 font-medium'
                  }`}
                >
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow">
                      {item.badge}
                    </span>
                  )}

                  {item.pulse && (
                    <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}

                  <div
                    className={`p-1.5 rounded-lg transition ${
                      isActive ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  </div>

                  <span className="text-[11px] mt-0.5 whitespace-nowrap tracking-tight">
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-amber-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MOBILE BAR (below md) - Ergonomic 5-slot layout */}
        <div className="block md:hidden max-w-lg mx-auto px-1">
          {userRole === 'rider' ? (
            <div className="grid grid-cols-5 items-center py-1.5">
              {/* 1. Painel */}
              <button
                onClick={() => onTabChange('dashboard')}
                className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
                  activeTab === 'dashboard' ? 'text-amber-400 font-bold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    activeTab === 'dashboard' ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-0.5">Painel</span>
                {activeTab === 'dashboard' && (
                  <span className="absolute bottom-0 w-6 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>

              {/* 2. Comboio */}
              <button
                onClick={() => onTabChange('convoy')}
                className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
                  activeTab === 'convoy' ? 'text-amber-400 font-bold' : 'text-slate-400'
                }`}
              >
                {isVoiceActive && (
                  <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
                <div
                  className={`p-1 rounded-lg ${
                    activeTab === 'convoy' ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400'
                  }`}
                >
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-0.5">Comboio</span>
                {activeTab === 'convoy' && (
                  <span className="absolute bottom-0 w-6 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>

              {/* 3. SOS (Elevated Center Quick Action) */}
              <button
                onClick={() => onTabChange('sos')}
                className="relative flex flex-col items-center justify-center -mt-3 active:scale-95"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition border ${
                    activeTab === 'sos'
                      ? 'bg-red-600 border-red-400 text-white shadow-red-900/60 ring-2 ring-red-500/40'
                      : 'bg-red-950/90 border-red-700/60 text-red-400 shadow-slate-950'
                  }`}
                >
                  <ShieldAlert className={`w-6 h-6 ${activeSOSCount > 0 ? 'animate-pulse' : ''}`} />
                  {activeSOSCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-red-600 font-mono text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow">
                      {activeSOSCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold tracking-tight mt-0.5 ${
                    activeTab === 'sos' ? 'text-red-400' : 'text-red-400/80'
                  }`}
                >
                  SOS
                </span>
              </button>

              {/* 4. Manutenção */}
              <button
                onClick={() => onTabChange('motorcycle')}
                className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
                  activeTab === 'motorcycle' ? 'text-amber-400 font-bold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    activeTab === 'motorcycle' ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400'
                  }`}
                >
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-0.5">Oficina</span>
                {activeTab === 'motorcycle' && (
                  <span className="absolute bottom-0 w-6 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>

              {/* 5. Mais (Opens bottom sheet with Passport, Diagnostics, etc) */}
              <button
                onClick={() => setIsMoreMenuOpen(true)}
                className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
                  isMoreActive ? 'text-amber-400 font-bold' : 'text-slate-400'
                }`}
              >
                {isMoreActive && (
                  <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-amber-400" />
                )}
                <div
                  className={`p-1 rounded-lg ${
                    isMoreActive ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400'
                  }`}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-0.5">
                  {activeTab === 'motorcycle' ? 'Passaporte' : activeTab === 'diagnostic' ? 'Triagem' : 'Mais'}
                </span>
                {isMoreActive && (
                  <span className="absolute bottom-0 w-6 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            </div>
          ) : (
            /* Non-rider roles (partner_shop, admin): 4 tabs fits cleanly */
            <div className="flex items-center justify-around py-1.5">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`relative flex flex-col items-center justify-center min-w-[60px] py-1 px-1.5 rounded-xl transition active:scale-95 ${
                      isActive ? 'text-amber-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow">
                        {item.badge}
                      </span>
                    )}

                    <div
                      className={`p-1 rounded-lg ${
                        isActive ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <span className="text-[10px] mt-0.5 whitespace-nowrap tracking-tight">
                      {item.label}
                    </span>

                    {isActive && (
                      <span className="absolute bottom-0 w-6 h-0.5 bg-amber-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </>
  );
};
