import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, Smartphone, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If running in standalone or dismissed, hide banner
  if (isInstalled || dismissed) {
    return null;
  }

  // Chromium / Android prompt
  if (isInstallable) {
    return (
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Smartphone className="w-4 h-4" />
          </span>
          <div>
            <p className="font-semibold text-slate-100">Instalar MotoRede no celular</p>
            <p className="text-slate-400 text-[11px]">Acesso sem barra de navegador e áudio em segundo plano</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-200"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari Flow
  if (isIOS) {
    return (
      <>
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-slate-800 text-slate-300">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
            <span className="text-slate-300">Adicione à tela de início para modo PWA</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIOSGuide(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium rounded text-xs border border-slate-700"
            >
              Como Instalar
            </button>
            <button onClick={() => setDismissed(true)} className="p-1 text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-200">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-500" />
                  Instalar no iPhone / iPad
                </h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Para usar o MotoRede com áudio contínuo em segundo plano e tela cheia:
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <p>Toque no ícone de <strong className="text-white">Compartilhar</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> na barra inferior do Safari.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <p>Role para baixo e selecione <strong className="text-amber-400">"Adicionar à Tela de Início"</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <p>Confirme clicando em <strong className="text-white">Adicionar</strong> no canto superior direito.</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
