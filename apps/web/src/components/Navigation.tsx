import React from 'react';
import {
  LayoutDashboard,
  Radio,
  ShieldAlert,
  Stethoscope,
  Store,
  Shield,
  MoreHorizontal,
  Bike,
  type LucideIcon,
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

/**
 * Barra de navegação de baixo.
 *
 * Piloto: Início · Comboio · SOS (no centro) · Moto · Mais. O SOS mora só aqui:
 * no cabeçalho ele era uma segunda porta para a mesma tela, e dois botões
 * vermelhos disputando o olhar enfraquecem o sinal de emergência.
 *
 * "Oficina" virou "Moto": a tela é a da moto do piloto (ficha, km,
 * manutenção), e "Oficina" se confundia com o perfil de oficina parceira.
 *
 * Rótulos com 12px no mínimo — 10px não se lê de relance com a moto parada
 * no acostamento. O "Mais" (tema, conta, diagnóstico) é uma folha controlada
 * pelo App, porque o avatar do cabeçalho também a abre.
 */

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  userRole: UserRole;
  activeSOSCount: number;
  isVoiceActive: boolean;
  onOpenMore: () => void;
  isMoreOpen: boolean;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  /** Rótulo para a barra do celular, onde cinco itens dividem ~360px. */
  short: string;
  icon: LucideIcon;
  badge?: number;
  pulse?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  userRole,
  activeSOSCount,
  isVoiceActive,
  onOpenMore,
  isMoreOpen,
}) => {
  const itensPorPapel = (): NavItem[] => {
    if (userRole === 'partner_shop') {
      return [
        { id: 'partner_shop', label: 'Painel da Oficina', short: 'Oficina', icon: Store },
        { id: 'motorcycle', label: 'Moto', short: 'Moto', icon: Bike },
        { id: 'sos', label: 'Rede SOS', short: 'SOS', icon: ShieldAlert, badge: activeSOSCount },
        { id: 'dashboard', label: 'Visão Piloto', short: 'Piloto', icon: LayoutDashboard },
      ];
    }
    if (userRole === 'admin') {
      return [
        { id: 'admin', label: 'Painel Admin', short: 'Admin', icon: Shield },
        { id: 'sos', label: 'Central SOS', short: 'SOS', icon: ShieldAlert, badge: activeSOSCount },
        { id: 'diagnostic', label: 'Moderação Triagem', short: 'Triagem', icon: Stethoscope },
        { id: 'dashboard', label: 'App Piloto', short: 'Piloto', icon: LayoutDashboard },
      ];
    }
    return [
      { id: 'dashboard', label: 'Início', short: 'Início', icon: LayoutDashboard },
      { id: 'convoy', label: 'Comboio', short: 'Comboio', icon: Radio, pulse: isVoiceActive },
      { id: 'sos', label: 'SOS', short: 'SOS', icon: ShieldAlert, badge: activeSOSCount },
      { id: 'motorcycle', label: 'Moto', short: 'Moto', icon: Bike },
    ];
  };

  const itens = itensPorPapel();
  // Para o piloto, o diagnóstico vive no "Mais": acender o Mais é o jeito de
  // dizer onde ele está.
  const maisAtivo = isMoreOpen || (userRole === 'rider' && activeTab === 'diagnostic');

  const botaoAba = (item: NavItem, desktop: boolean) => {
    const Icon = item.icon;
    const ativo = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        aria-current={ativo ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-center min-h-14 min-w-0 rounded-xl transition active:scale-95 ${
          desktop ? 'min-w-[80px] px-3 py-1.5' : 'px-0.5 py-1'
        } ${ativo ? 'text-brand-soft font-bold' : 'text-ink-muted hover:text-ink font-medium'}`}
      >
        {item.badge !== undefined && item.badge > 0 && (
          <span className="absolute top-0.5 right-1/2 translate-x-5 min-w-5 h-5 px-1 rounded-full bg-sos text-on-sos font-mono text-xs font-bold flex items-center justify-center shadow">
            {item.badge}
          </span>
        )}
        {item.pulse && (
          <span className="absolute top-1 right-1/2 translate-x-4 w-2 h-2 rounded-full bg-live animate-ping" />
        )}
        <span className={`p-1 rounded-lg ${ativo ? 'bg-brand/15 text-brand-soft' : ''}`}>
          <Icon className={`w-5 h-5 ${ativo ? 'stroke-[2.5]' : 'stroke-2'}`} />
        </span>
        <span className="text-xs leading-tight mt-0.5 max-w-full truncate">
          {desktop ? item.label : item.short}
        </span>
        {ativo && <span className="absolute bottom-0 w-6 h-0.5 bg-brand rounded-full" />}
      </button>
    );
  };

  const botaoMais = (desktop: boolean) => (
    <button
      key="mais"
      onClick={onOpenMore}
      aria-haspopup="dialog"
      aria-expanded={isMoreOpen}
      className={`relative flex flex-col items-center justify-center min-h-14 min-w-0 rounded-xl transition active:scale-95 ${
        desktop ? 'min-w-[80px] px-3 py-1.5' : 'px-0.5 py-1'
      } ${maisAtivo ? 'text-brand-soft font-bold' : 'text-ink-muted hover:text-ink font-medium'}`}
    >
      <span className={`p-1 rounded-lg ${maisAtivo ? 'bg-brand/15 text-brand-soft' : ''}`}>
        <MoreHorizontal className="w-5 h-5" />
      </span>
      <span className="text-xs leading-tight mt-0.5">Mais</span>
      {maisAtivo && <span className="absolute bottom-0 w-6 h-0.5 bg-brand rounded-full" />}
    </button>
  );

  // SOS do piloto: botão elevado no centro. Vermelho cheio só quando a aba
  // está aberta ou há chamado — vermelho grande é reservado à emergência.
  const botaoSOSCentral = () => {
    const ativo = activeTab === 'sos';
    return (
      <button
        key="sos"
        onClick={() => onTabChange('sos')}
        aria-current={ativo ? 'page' : undefined}
        aria-label={activeSOSCount > 0 ? `SOS, ${activeSOSCount} chamado(s)` : 'SOS'}
        className="relative flex flex-col items-center justify-center min-h-14 -mt-3 active:scale-95"
      >
        <span
          className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition border ${
            ativo
              ? 'bg-sos border-sos text-on-sos shadow-sos/30 ring-2 ring-sos/40'
              : 'bg-sos/15 border-sos text-danger shadow-canvas'
          }`}
        >
          <ShieldAlert className={`w-6 h-6 ${activeSOSCount > 0 ? 'animate-pulse' : ''}`} />
          {activeSOSCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-sos text-on-sos font-mono text-xs font-black flex items-center justify-center border-2 border-canvas shadow">
              {activeSOSCount}
            </span>
          )}
        </span>
        <span className="text-xs font-bold leading-tight mt-0.5 text-danger">SOS</span>
      </button>
    );
  };

  const itensCelular =
    userRole === 'rider'
      ? itens.map((item) => (item.id === 'sos' ? botaoSOSCentral() : botaoAba(item, false)))
      : itens.map((item) => botaoAba(item, false));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-30 bg-canvas/95 backdrop-blur-lg border-t border-line/90 pb-safe shadow-lg"
    >
      {/* Desktop (md+): todos os itens com o rótulo longo. */}
      <div className="hidden md:flex max-w-4xl mx-auto px-4 items-center justify-around py-1.5">
        {itens.map((item) => botaoAba(item, true))}
        {botaoMais(true)}
      </div>

      {/* Celular: cinco colunas iguais; o SOS do piloto fica no meio. */}
      <div className="md:hidden max-w-lg mx-auto px-1 grid grid-cols-5 items-center py-1">
        {itensCelular}
        {botaoMais(false)}
      </div>
    </nav>
  );
};
