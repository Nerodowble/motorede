import React from 'react';
import {
  Radio,
  ShieldAlert,
  Smartphone,
  WifiOff,
  User,
  Wrench,
  Shield,
  Bike,
  LogOut,
  LogIn,
  Settings2,
} from 'lucide-react';
import { UserRole, UserProfile } from '@motorede/shared';
import { useOnlineStatus } from '../hooks/usePWAInstall';

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  activeSOSCount: number;
  isBackgroundAudioActive: boolean;
  onOpenLockscreenModal: () => void;
  onSOSClick: () => void;
  onOpenEditMotorcycle?: () => void;
  /** Seletor de tema, renderizado no cabeçalho. */
  themeToggle?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenAuthModal,
  onLogout,
  activeSOSCount,
  isBackgroundAudioActive,
  onOpenLockscreenModal,
  onSOSClick,
  onOpenEditMotorcycle,
  themeToggle,
}) => {
  const isOnline = useOnlineStatus();

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'partner_shop':
        return {
          label: 'Oficina',
          icon: Wrench,
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        };
      case 'admin':
        return {
          label: 'Admin',
          icon: Shield,
          color: 'bg-red-500/10 text-red-400 border-red-500/30',
        };
      default:
        return {
          label: 'Piloto',
          icon: Bike,
          color: 'bg-brand/10 text-brand-soft border-brand/30',
        };
    }
  };

  const roleBadge = currentUser ? getRoleBadge(currentUser.role) : null;
  const RoleIcon = roleBadge ? roleBadge.icon : User;

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-md border-b border-line/80 px-3 sm:px-4 py-2.5 pt-safe">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand & Status */}
        {themeToggle && <div className="shrink-0 mr-1">{themeToggle}</div>}

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand flex items-center justify-center text-on-brand font-black text-base sm:text-lg shadow-sm shrink-0">
            <span>M</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-ink tracking-tight text-sm sm:text-base leading-none">
                MotoRede
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand/10 text-brand-soft border border-brand/20 font-mono">
                PWA
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-muted">
              {isBackgroundAudioActive ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Áudio Ativo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-ink-muted">
                  <Radio className="w-3 h-3 text-ink-faint" />
                  Pronto
                </span>
              )}

              {/* Online/offline badge */}
              {!isOnline && (
                <span className="flex items-center gap-1 text-brand-soft">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side controls: Lockscreen, SOS, and User Authentication */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Lock screen test button (desktop only) */}
          <button
            onClick={onOpenLockscreenModal}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-elevated text-ink-muted border border-line text-xs font-medium transition active:scale-95"
            title="Simular visual de tela bloqueada com controles de áudio"
          >
            <Smartphone className="w-3.5 h-3.5 text-brand-soft" />
            <span className="text-[11px]">Tela Bloqueada</span>
          </button>

          {/* Quick SOS Trigger Button */}
          <button
            onClick={onSOSClick}
            className="relative px-2 sm:px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1 sm:gap-1.5 shadow-md shadow-red-950 transition border border-red-500/40 shrink-0"
            title="Abrir Central SOS de Emergência"
          >
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span className="hidden xs:inline sm:inline">SOS</span>
            {activeSOSCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-red-600 font-mono text-[9px] sm:text-[10px] flex items-center justify-center font-bold">
                {activeSOSCount}
              </span>
            )}
          </button>

          {/* User Profile / Auth Button */}
          {currentUser ? (
            <div className="flex items-center gap-1 bg-surface/90 border border-line rounded-xl p-1 sm:pl-2">
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 text-left group hover:opacity-90 transition px-1 py-0.5"
                title="Ver perfil ou alternar conta"
              >
                {/* Mobile avatar circle */}
                <div className="w-6 h-6 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center text-brand-soft font-bold text-xs shrink-0 sm:hidden">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>

                <div className="hidden sm:flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-ink max-w-[90px] md:max-w-[130px] truncate group-hover:text-brand-soft">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    {roleBadge && (
                      <span
                        className={`text-[9px] font-bold px-1 py-0.2 rounded border uppercase font-mono flex items-center gap-0.5 ${roleBadge.color}`}
                      >
                        <RoleIcon className="w-2.5 h-2.5" />
                        {roleBadge.label}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-ink-faint truncate max-w-[90px] md:max-w-[130px]">
                    {currentUser.role === 'partner_shop'
                      ? currentUser.shopName || 'Oficina'
                      : currentUser.motorcycle
                      ? `${currentUser.motorcycle.brand} ${currentUser.motorcycle.model}`
                      : currentUser.email}
                  </span>
                </div>
              </button>

              {currentUser.role === 'rider' && onOpenEditMotorcycle && (
                <button
                  onClick={onOpenEditMotorcycle}
                  className="p-1 sm:p-1.5 rounded-lg text-brand-soft hover:text-brand-soft hover:bg-elevated transition"
                  title="Editar Ficha Técnica da Moto"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onLogout}
                className="p-1 sm:p-1.5 rounded-lg text-ink-muted hover:text-red-400 hover:bg-elevated transition"
                title="Desconectar da conta"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-brand hover:opacity-90 text-on-brand font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

