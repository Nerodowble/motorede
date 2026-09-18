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
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
    }
  };

  const roleBadge = currentUser ? getRoleBadge(currentUser.role) : null;
  const RoleIcon = roleBadge ? roleBadge.icon : User;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2.5 pt-safe">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand & Status */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-base sm:text-lg shadow-sm shrink-0">
            <span>M</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-100 tracking-tight text-sm sm:text-base leading-none">
                MotoRede
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                PWA
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
              {isBackgroundAudioActive ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Áudio Ativo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                  <Radio className="w-3 h-3 text-slate-500" />
                  Pronto
                </span>
              )}

              {/* Online/offline badge */}
              {!isOnline && (
                <span className="flex items-center gap-1 text-amber-400">
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
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition active:scale-95"
            title="Simular visual de tela bloqueada com controles de áudio"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
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
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 sm:pl-2">
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 text-left group hover:opacity-90 transition px-1 py-0.5"
                title="Ver perfil ou alternar conta"
              >
                {/* Mobile avatar circle */}
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0 sm:hidden">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>

                <div className="hidden sm:flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-200 max-w-[90px] md:max-w-[130px] truncate group-hover:text-amber-400">
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
                  <span className="text-[9px] text-slate-500 truncate max-w-[90px] md:max-w-[130px]">
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
                  className="p-1 sm:p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition"
                  title="Editar Ficha Técnica da Moto"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onLogout}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                title="Desconectar da conta"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow shrink-0"
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

