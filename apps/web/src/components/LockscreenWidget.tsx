import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, ShieldAlert, Radio, Lock, Unlock, Compass } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { VoiceRoom } from '@motorede/shared';
import { GeoPoint } from '../services/geolocation';

interface LockscreenWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  voiceRoom: VoiceRoom;
  userCoords: GeoPoint | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onTriggerSOS: () => void;
}

export const LockscreenWidget: React.FC<LockscreenWidgetProps> = ({
  isOpen,
  onClose,
  voiceRoom,
  userCoords,
  isMuted,
  onToggleMute,
  onTriggerSOS,
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-canvas border border-line p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[580px]">
        {/* Top bar with Lock icon */}
        <div>
          <div className="flex items-center justify-between text-ink-muted text-xs mb-6">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-ink">MotoRede OS</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">2º PLANO ATIVO</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-ink-muted" />
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-xs text-brand-soft hover:text-brand-soft font-semibold ml-2 px-2 py-1 rounded bg-surface border border-line"
              >
                <Unlock className="w-3.5 h-3.5" />
                Desbloquear
              </button>
            </div>
          </div>

          {/* Clock Display */}
          <div className="text-center my-4">
            <p className="text-5xl font-extrabold text-ink tracking-tight font-mono">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-ink-muted mt-1 capitalize">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* MediaSession Player Banner on Lock Screen */}
        <div className="space-y-4 my-auto">
          <div className="rounded-2xl bg-surface/90 border border-line p-4 shadow-lg backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-xs font-bold text-ink truncate">{voiceRoom.name}</p>
                </div>
                <p className="text-[11px] text-ink-muted truncate">
                  Canal {voiceRoom.code} • {voiceRoom.participants.length} motociclistas
                </p>
                <p className="text-[10px] text-brand-soft font-mono mt-0.5">
                  {isMuted ? 'Microfone Mudo (Pressione p/ Falar)' : 'Áudio Aberto • Transmitindo'}
                </p>
              </div>
            </div>

            {/* Audio Lockscreen Controls */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-line/80">
              <button
                onClick={() => {
                  onToggleMute();
                  audioEngine.playRadioChirp(!isMuted);
                }}
                className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                  isMuted
                    ? 'bg-elevated hover:bg-line-strong text-ink border border-line-strong'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4 text-brand-soft" /> : <Mic className="w-4 h-4" />}
                {isMuted ? 'Ativar Voz' : 'Mutar Mic'}
              </button>

              <button
                onClick={() => audioEngine.playRadioChirp(true)}
                className="py-3 px-4 rounded-xl bg-elevated hover:bg-line-strong text-ink border border-line-strong font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Volume2 className="w-4 h-4 text-brand-soft" />
                Bip Rádio
              </button>
            </div>
          </div>

          {/* GPS Live Status on Lock Screen */}
          <div className="rounded-xl bg-surface/60 border border-line/60 p-3 flex items-center justify-between text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              <span>GPS 2º Plano:</span>
            </div>
            <span className="font-mono text-ink-muted text-[11px]">
              {userCoords
                ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
                : 'sem GPS'}
            </span>
          </div>
        </div>

        {/* Lockscreen Quick Emergency Button */}
        <div className="pt-2">
          <button
            onClick={onTriggerSOS}
            className="w-full py-3.5 px-4 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition active:scale-95 border border-red-500/30"
          >
            <ShieldAlert className="w-5 h-5" />
            SOS Emergência na Estrada
          </button>
          <p className="text-center text-[10px] text-ink-faint mt-2">
            Disparo instantâneo para motociclistas num raio de até 15 km
          </p>
        </div>
      </div>
    </div>
  );
};
