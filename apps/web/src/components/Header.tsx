import React from 'react';
import { WifiOff, LogIn } from 'lucide-react';
import { UserProfile } from '@motorede/shared';
import { useOnlineStatus } from '../hooks/usePWAInstall';

/**
 * Cabeçalho.
 *
 * No celular são só dois alvos de 44px: a marca (volta ao início) e a conta.
 * Antes eram até seis (tema, SOS, perfil, ficha, sair, tela bloqueada) em
 * ~360px, pequenos demais para acertar de luva. Para onde cada um foi:
 * - SOS: botão central da barra de baixo (aqui era duplicata);
 * - tema e sair: "Mais", que o avatar abre;
 * - ficha da moto: aba Moto;
 * - tela bloqueada: ferramenta de teste, só em desenvolvimento, no "Mais";
 * - "Pronto/Áudio ativo": cartão do comboio no Início, com o estado real;
 * - selo "PWA": jargão técnico, não informa nada ao piloto.
 *
 * O aviso de offline fica: não é alvo de toque, e explica por que a voz não
 * conecta.
 */

interface HeaderProps {
  currentUser: UserProfile | null;
  /** Foto do Google, quando houver. */
  fotoUrl?: string;
  /** Avatar: abre a conta ("Mais"). */
  onOpenAccount: () => void;
  /** Sem sessão: abre o login local. */
  onOpenAuthModal: () => void;
  /** Marca: volta à tela inicial do papel. */
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  fotoUrl,
  onOpenAccount,
  onOpenAuthModal,
  onGoHome,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-md border-b border-line/80 px-3 sm:px-4 py-1.5 pt-safe">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* min-w-0: sem ele o bloco não encolhe e empurra a conta para fora da
            tela em celulares estreitos (o overflow-x: clip corta sem aviso). */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 sm:gap-2.5 min-w-0 min-h-11 pr-2 rounded-xl active:scale-95 transition"
          aria-label="MotoRede — ir para o início"
        >
          <img
            src="/marca-pino.png"
            alt=""
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
            width={36}
            height={36}
          />
          <span className="font-extrabold text-ink tracking-tight text-base leading-none truncate">
            MotoRede
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs font-semibold text-warning" role="status">
              <WifiOff className="w-4 h-4" />
              Offline
            </span>
          )}

          {currentUser ? (
            <button
              onClick={onOpenAccount}
              className="flex items-center gap-2 min-h-11 min-w-11 justify-center sm:pl-3 sm:pr-1 rounded-full hover:bg-elevated transition active:scale-95"
              aria-label={`Conta de ${currentUser.name}`}
              aria-haspopup="dialog"
            >
              {/* No celular só o avatar; a partir de sm cabe o primeiro nome. */}
              <span className="hidden sm:inline text-sm font-semibold text-ink max-w-[140px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt=""
                  className="w-9 h-9 rounded-full border border-line-strong shrink-0"
                />
              ) : (
                <span className="w-9 h-9 rounded-full bg-elevated border border-line-strong flex items-center justify-center text-ink font-bold text-sm shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="min-h-11 px-4 rounded-xl bg-action hover:opacity-90 text-on-action font-bold text-sm flex items-center gap-1.5 transition active:scale-95 shadow shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
