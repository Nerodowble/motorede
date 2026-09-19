import React, { useState } from 'react';
import { Download, Smartphone, X, ChevronRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { storageService } from '../services/storage';

/**
 * Convite para colocar o MotoRede na tela inicial.
 *
 * POR QUE NEM SEMPRE HÁ UM BOTÃO QUE INSTALA
 *
 * O navegador só permite abrir o diálogo nativo de instalação quando ELE
 * dispara o evento `beforeinstallprompt` — uma proteção contra sites que
 * pedem instalação o tempo todo. Não existe forma de forçá-lo.
 *
 * O Chrome guarda esse evento até considerar que houve "engajamento" com o
 * site, e nunca mais o dispara para quem já instalou. O Safari no iOS não o
 * implementa de forma alguma.
 *
 * Por isso este componente tem dois caminhos: quando o navegador permite, um
 * toque instala; quando não permite, ele mostra o passo a passo do próprio
 * aparelho, em vez de simplesmente não aparecer. O usuário sempre tem um
 * caminho a partir de dentro do app.
 */

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [mostrarPassos, setMostrarPassos] = useState(false);
  const [dispensado, setDispensado] = useState(() => storageService.isInstallDismissed());

  if (isInstalled || dispensado) return null;

  const dispensar = () => {
    storageService.dismissInstall();
    setDispensado(true);
  };

  const passos = isIOS
    ? ['Toque em Compartilhar, na barra do Safari', 'Escolha "Adicionar à Tela de Início"', 'Confirme em "Adicionar"']
    : ['Toque no menu ⋮ do navegador', 'Escolha "Instalar app" ou "Adicionar à tela inicial"', 'Confirme'];

  return (
    <div className="bg-surface border-b border-line px-4 py-2.5">
      <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg bg-brand/10 text-brand-soft shrink-0">
            <Smartphone className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">
              Colocar o MotoRede na tela inicial
            </p>
            <p className="text-[11px] text-ink-muted truncate">
              Abre direto, sem barra de navegador
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:opacity-90 active:scale-95 text-on-brand font-bold rounded-lg text-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </button>
          ) : (
            <button
              onClick={() => setMostrarPassos((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 bg-elevated hover:bg-line-strong text-ink font-bold rounded-lg text-xs border border-line-strong transition"
            >
              Como fazer
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${mostrarPassos ? 'rotate-90' : ''}`}
              />
            </button>
          )}

          <button
            onClick={dispensar}
            className="p-1 text-ink-faint hover:text-ink-muted"
            title="Dispensar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {mostrarPassos && (
        <div className="max-w-5xl mx-auto mt-2.5 pt-2.5 border-t border-line">
          <ol className="space-y-1.5">
            {passos.map((passo, i) => (
              <li key={passo} className="flex items-start gap-2 text-[11px] text-ink-muted">
                <span className="w-4 h-4 rounded bg-elevated text-brand-soft text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {passo}
              </li>
            ))}
          </ol>
          <p className="text-[10px] text-ink-faint mt-2">
            Seu navegador não permite que o app abra essa janela sozinho — por isso o
            passo a passo.
          </p>
        </div>
      )}
    </div>
  );
};
