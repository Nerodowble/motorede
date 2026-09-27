import React, { useState } from 'react';
import {
  Stethoscope,
  X,
  Smartphone,
  ChevronRight,
  Download,
  LogOut,
  UserRound,
  Palette,
} from 'lucide-react';
import type { UserProfile, UserRole } from '@motorede/shared';
import type { ThemeChoice } from '../hooks/useTheme';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ThemeToggle } from './ThemeToggle';
import { passosDeInstalacao } from './PWAInstallBanner';
import type { ActiveTab } from './Navigation';

/**
 * Folha "Mais".
 *
 * Recebe o que saiu do cabeçalho para ele caber em três alvos no celular:
 * tema (Aparência), conta e sair. Fica montada o tempo todo (só o conteúdo
 * some) porque usePWAInstall precisa estar ouvindo quando o navegador disparar
 * o evento de instalação — ele não se repete.
 *
 * Saíram daqui duas coisas: "Passaporte & Ficha", que era a mesma tela da aba
 * Moto, e o simulador de tela bloqueada, que é ferramenta de teste e só
 * aparece em desenvolvimento.
 */

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentUser: UserProfile | null;
  fotoUrl?: string;
  themeChoice: ThemeChoice;
  onThemeChange: (choice: ThemeChoice) => void;
  /** Perfil / trocar conta (só existe sem o login do Google). */
  onOpenProfile?: () => void;
  onLogout: () => void;
  /** Só em desenvolvimento. */
  onOpenLockscreenModal?: () => void;
}

const tituloSecao = 'text-xs font-bold text-ink-muted uppercase tracking-wider font-mono mb-2';
const linha =
  'w-full min-h-14 p-3 rounded-xl border bg-canvas/60 border-line text-ink hover:bg-elevated flex items-center justify-between gap-3 transition active:scale-[0.99] text-left';

export const MoreSheet: React.FC<MoreSheetProps> = ({
  isOpen,
  onClose,
  userRole,
  activeTab,
  onTabChange,
  currentUser,
  fotoUrl,
  themeChoice,
  onThemeChange,
  onOpenProfile,
  onLogout,
  onOpenLockscreenModal,
}) => {
  const pwa = usePWAInstall();
  const [mostrarPassos, setMostrarPassos] = useState(false);

  if (!isOpen) return null;

  const fecharE = (acao: () => void) => () => {
    onClose();
    acao();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mais opções"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-canvas/80 backdrop-blur-sm"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full sm:max-w-md bg-surface border-t sm:border border-line rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto pb-safe">
        <div className="w-12 h-1.5 bg-line-strong rounded-full mx-auto -mt-1 sm:hidden" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Mais</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:text-ink bg-elevated/80 active:scale-95"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ferramentas. Diagnóstico é só do piloto; admin e oficina já têm a
            triagem (ou não precisam dela) nas próprias abas. */}
        {userRole === 'rider' && (
          <section>
            <h3 className={tituloSecao}>Ferramentas</h3>
            <button
              onClick={fecharE(() => onTabChange('diagnostic'))}
              className={`${linha} ${activeTab === 'diagnostic' ? 'border-brand/40' : ''}`}
              aria-current={activeTab === 'diagnostic' ? 'page' : undefined}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center text-info shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">Diagnóstico na estrada</span>
                  <span className="block text-xs text-ink-muted">Triagem de sintomas passo a passo</span>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
            </button>
          </section>
        )}

        <section>
          <h3 className={`${tituloSecao} flex items-center gap-1.5`}>
            <Palette className="w-3.5 h-3.5" />
            Aparência
          </h3>
          <ThemeToggle choice={themeChoice} onChange={onThemeChange} comRotulos />
        </section>

        {/* Instalar: o banner do topo some depois de dispensado; aqui o
            caminho continua existindo enquanto o app não estiver instalado. */}
        {!pwa.isInstalled && (
          <section>
            <h3 className={tituloSecao}>App</h3>
            <button
              onClick={() => (pwa.isInstallable ? void pwa.install() : setMostrarPassos((v) => !v))}
              className={linha}
              aria-expanded={pwa.isInstallable ? undefined : mostrarPassos}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-elevated border border-line-strong flex items-center justify-center text-ink shrink-0">
                  <Download className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">Instalar app</span>
                  <span className="block text-xs text-ink-muted">Abre direto da tela inicial</span>
                </span>
              </span>
              <ChevronRight
                className={`w-4 h-4 text-ink-faint shrink-0 transition-transform ${mostrarPassos ? 'rotate-90' : ''}`}
              />
            </button>
            {mostrarPassos && !pwa.isInstallable && (
              <ol className="mt-2 space-y-1.5 px-1">
                {passosDeInstalacao(pwa.isIOS).map((passo, i) => (
                  <li key={passo} className="flex items-start gap-2 text-xs text-ink-muted">
                    <span className="w-5 h-5 rounded bg-elevated text-ink text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {passo}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {currentUser && (
          <section>
            <h3 className={tituloSecao}>Conta</h3>
            <div className="rounded-xl border border-line bg-canvas/60 divide-y divide-line">
              <div className="flex items-center gap-3 p-3">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="" className="w-10 h-10 rounded-full border border-line-strong shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-elevated border border-line-strong flex items-center justify-center text-ink font-bold shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink truncate">{currentUser.name}</span>
                  <span className="block text-xs text-ink-muted truncate">{currentUser.email}</span>
                </span>
              </div>
              {onOpenProfile && (
                <button
                  onClick={fecharE(onOpenProfile)}
                  className="w-full min-h-12 px-3 flex items-center gap-3 text-sm font-semibold text-ink hover:bg-elevated transition"
                >
                  <UserRound className="w-4 h-4 text-ink-muted" />
                  Perfil e trocar conta
                </button>
              )}
              <button
                onClick={fecharE(onLogout)}
                className="w-full min-h-12 px-3 flex items-center gap-3 text-sm font-semibold text-danger hover:bg-elevated transition rounded-b-xl"
              >
                <LogOut className="w-4 h-4" />
                Sair da conta
              </button>
            </div>
          </section>
        )}

        {/* Ferramenta de teste: fora do build de produção. */}
        {import.meta.env.DEV && onOpenLockscreenModal && (
          <section>
            <h3 className={tituloSecao}>Desenvolvimento</h3>
            <button onClick={fecharE(onOpenLockscreenModal)} className={linha}>
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-elevated border border-line-strong flex items-center justify-center text-ink-muted shrink-0">
                  <Smartphone className="w-5 h-5" />
                </span>
                <span className="block text-sm font-bold">Simulador de tela bloqueada</span>
              </span>
              <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
            </button>
          </section>
        )}
      </div>
    </div>
  );
};
