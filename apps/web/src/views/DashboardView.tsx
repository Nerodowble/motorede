import React, { useState, useEffect } from 'react';
import { Radio, Wrench, ChevronRight, Bike, Gauge } from 'lucide-react';
import { Motorcycle, VoiceRoom, type MaintenanceItemStatus } from '@motorede/shared';
import { storageService } from '../services/storage';
import { ActiveTab } from '../components/Navigation';
import { MotorcycleEmptyState } from '../components/MotorcycleEmptyState';

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
  motorcycle: Motorcycle | null;
  maintenance: MaintenanceItemStatus[];
  voiceRoom: VoiceRoom;
  onNavigateTab: (tab: ActiveTab) => void;
  onUpdateKm: (newKm: number) => void;
  onOpenEditMotorcycle?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  motorcycle,
  maintenance,
  voiceRoom,
  onNavigateTab,
  onUpdateKm,
  onOpenEditMotorcycle,
}) => {
  const [isEditingKm, setIsEditingKm] = useState(false);
  const [kmInput, setKmInput] = useState(motorcycle?.currentKm.toString() ?? '');

  useEffect(() => {
    setKmInput(motorcycle?.currentKm.toString() ?? '');
  }, [motorcycle?.currentKm]);

  // Mesmo comboio que a tela de voz abre, para os dois não divergirem.
  const roomCode = storageService.getLastRoomCode() || voiceRoom.code;

  // Só o que realmente pede ação, e só com base em registro do próprio piloto.
  // Item sem histórico não aparece: não há o que afirmar sobre ele.
  const needsAttention = maintenance
    .filter((m) => m.status === 'vencido' || m.status === 'proximo')
    .sort((a, b) => (a.kmRemaining ?? 0) - (b.kmRemaining ?? 0));

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
      <div className="rounded-2xl bg-gradient-to-b from-surface to-canvas border border-line p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-soft shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted uppercase tracking-wider font-mono">
              Seu comboio
            </p>
            <p className="text-2xl font-extrabold text-brand-soft font-mono tracking-widest leading-tight">
              {roomCode}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('convoy')}
          className="w-full py-4 rounded-xl bg-brand hover:opacity-90 text-on-brand font-black text-base uppercase tracking-wide transition active:scale-95 shadow-lg"
        >
          Abrir comboio
        </button>
      </div>

      {/* A moto em uma linha. Sem cadastro, um convite — e nunca acima do
          comboio: falta de moto não bloqueia a voz. */}
      {motorcycle ? (
      <div className="rounded-2xl bg-surface/80 border border-line p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center text-ink-muted shrink-0">
            <Bike className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink truncate">
              {motorcycle!.brand} {motorcycle!.model}
            </p>
            <p className="text-[11px] text-ink-muted font-mono">
              {motorcycle!.currentKm.toLocaleString('pt-BR')} km
              {motorcycle!.licensePlate ? ` · ${motorcycle!.licensePlate}` : ''}
            </p>
          </div>

          <button
            onClick={() => setIsEditingKm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-semibold border border-line-strong transition active:scale-95 shrink-0"
          >
            <Gauge className="w-4 h-4 text-brand-soft" />
            KM
          </button>

          {onOpenEditMotorcycle && (
            <button
              onClick={onOpenEditMotorcycle}
              className="px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-semibold border border-line-strong transition active:scale-95 shrink-0"
            >
              Ficha
            </button>
          )}
        </div>

        {isEditingKm && (
          <form onSubmit={handleSaveKm} className="mt-3 pt-3 border-t border-line flex items-center gap-2">
            <input
              type="number"
              value={kmInput}
              onChange={(e) => setKmInput(e.target.value)}
              autoFocus
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-canvas border border-line-strong text-ink text-sm font-mono focus:outline-none focus:border-brand/60"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand hover:opacity-90 text-on-brand text-xs font-bold transition active:scale-95"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsEditingKm(false)}
              className="px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink-muted text-xs font-semibold border border-line-strong transition"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
      ) : (
        <MotorcycleEmptyState onCadastrar={onOpenEditMotorcycle} />
      )}

      {/* Manutenção: só aparece quando há algo a fazer. */}
      {needsAttention.length > 0 && (
        <button
          onClick={() => onNavigateTab('motorcycle')}
          className="w-full rounded-2xl bg-surface/80 border border-line p-4 text-left hover:border-line-strong transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-brand" />
            <span className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex-1">
              Precisa de atenção ({needsAttention.length})
            </span>
            <ChevronRight className="w-4 h-4 text-ink-faint" />
          </div>

          <div className="space-y-2">
            {needsAttention.slice(0, 3).map((m) => (
              <div key={m.category} className="flex items-center justify-between gap-3">
                <span className="text-xs text-ink-muted truncate">{m.label}</span>
                <span
                  className={`text-[11px] font-mono font-bold shrink-0 ${
                    m.status === 'vencido' ? 'text-red-400' : 'text-brand-soft'
                  }`}
                >
                  {m.status === 'vencido'
                    ? `${Math.abs(m.kmRemaining ?? 0).toLocaleString('pt-BR')} km atrasado`
                    : `faltam ${(m.kmRemaining ?? 0).toLocaleString('pt-BR')} km`}
                </span>
              </div>
            ))}
          </div>
        </button>
      )}
    </div>
  );
};
