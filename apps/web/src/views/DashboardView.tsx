import React, { useState, useEffect } from 'react';
import { Radio, Wrench, ChevronRight, Bike, Gauge } from 'lucide-react';
import { Motorcycle, ConsumableStatus, VoiceRoom } from '@motorede/shared';
import { storageService } from '../services/storage';
import { ActiveTab } from '../components/Navigation';

/**
 * Painel inicial.
 *
 * Enxugado de propósito. A versão anterior tinha cerca de 22 alvos tocáveis e
 * cinco blocos de peso visual idêntico, com quatro sinais de urgência animados
 * competindo — e todos eram ficção: contagem de pilotos fixa no código, rota
 * para um destino que o piloto nunca escolheu, alertas de socorro inventados.
 * Quando tudo é urgente, nada é; e alerta que nunca significa nada ensina o
 * usuário a ignorar alertas de verdade.
 *
 * Também saíram três duplicatas da navegação: o botão de SOS (que já é o botão
 * central), o de tela bloqueada (que já está no cabeçalho e na gaveta) e os
 * atalhos de rota externa (que pertencem à tela do comboio, onde o destino é
 * escolhido).
 *
 * Ficou o que responde à pergunta de quem abre o app de capacete na mão:
 * qual é o meu comboio, e como entro nele.
 */

interface DashboardViewProps {
  motorcycle: Motorcycle;
  consumables: ConsumableStatus[];
  voiceRoom: VoiceRoom;
  onNavigateTab: (tab: ActiveTab) => void;
  onUpdateKm: (newKm: number) => void;
  onOpenEditMotorcycle?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  motorcycle,
  consumables,
  voiceRoom,
  onNavigateTab,
  onUpdateKm,
  onOpenEditMotorcycle,
}) => {
  const [isEditingKm, setIsEditingKm] = useState(false);
  const [kmInput, setKmInput] = useState(motorcycle.currentKm.toString());

  useEffect(() => {
    setKmInput(motorcycle.currentKm.toString());
  }, [motorcycle.currentKm]);

  // Mesmo comboio que a tela de voz abre, para os dois não divergirem.
  const roomCode = storageService.getLastRoomCode() || voiceRoom.code;

  // Só o que realmente pede ação. Item em dia não precisa ocupar a tela.
  const needsAttention = consumables
    .filter((c) => c.status === 'critical' || c.status === 'warning')
    .sort((a, b) => a.estimatedRemainingKm - b.estimatedRemainingKm);

  const handleSaveKm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(kmInput, 10);
    if (!isNaN(val) && val > 0) {
      onUpdateKm(val);
      setIsEditingKm(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-2xl mx-auto px-3 sm:px-4 py-4">
      {/* Ação principal: o comboio. É o que o piloto abre o app para fazer. */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
              Seu comboio
            </p>
            <p className="text-2xl font-extrabold text-amber-400 font-mono tracking-widest leading-tight">
              {roomCode}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('convoy')}
          className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base uppercase tracking-wide transition active:scale-95 shadow-lg"
        >
          Abrir comboio
        </button>
      </div>

      {/* A moto em uma linha. Os detalhes vivem na ficha e no passaporte. */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
            <Bike className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-100 truncate">
              {motorcycle.brand} {motorcycle.model}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {motorcycle.currentKm.toLocaleString('pt-BR')} km
              {motorcycle.licensePlate ? ` · ${motorcycle.licensePlate}` : ''}
            </p>
          </div>

          <button
            onClick={() => setIsEditingKm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95 shrink-0"
          >
            <Gauge className="w-4 h-4 text-amber-400" />
            KM
          </button>

          {onOpenEditMotorcycle && (
            <button
              onClick={onOpenEditMotorcycle}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95 shrink-0"
            >
              Ficha
            </button>
          )}
        </div>

        {isEditingKm && (
          <form onSubmit={handleSaveKm} className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="number"
              value={kmInput}
              onChange={(e) => setKmInput(e.target.value)}
              autoFocus
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500/60"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition active:scale-95"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsEditingKm(false)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Manutenção: só aparece quando há algo a fazer. */}
      {needsAttention.length > 0 && (
        <button
          onClick={() => onNavigateTab('maintenance')}
          className="w-full rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-left hover:border-slate-700 transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex-1">
              Precisa de atenção ({needsAttention.length})
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-2">
            {needsAttention.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-300 truncate">{c.name}</span>
                <span
                  className={`text-[11px] font-mono font-bold shrink-0 ${
                    c.status === 'critical' ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {c.estimatedRemainingKm.toLocaleString('pt-BR')} km
                </span>
              </div>
            ))}
          </div>
        </button>
      )}
    </div>
  );
};
