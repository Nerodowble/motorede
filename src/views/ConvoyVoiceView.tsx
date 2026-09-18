import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Share2,
  QrCode,
  Users,
  Navigation,
  ExternalLink,
  MapPin,
  Check,
  Copy,
  Plus,
  Headphones,
  Signal,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { VoiceRoom, VoiceParticipant } from '../types';
import { audioEngine } from '../services/audioEngine';
import { getGoogleMapsNavigationUrl, getWazeNavigationUrl } from '../services/geolocation';

interface ConvoyVoiceViewProps {
  voiceRoom: VoiceRoom;
  onUpdateVoiceRoom: (updated: Partial<VoiceRoom>) => void;
  isBackgroundAudioActive: boolean;
  onToggleBackgroundSession: (active: boolean) => void;
}

export const ConvoyVoiceView: React.FC<ConvoyVoiceViewProps> = ({
  voiceRoom,
  onUpdateVoiceRoom,
  isBackgroundAudioActive,
  onToggleBackgroundSession,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(85);
  const [isPTTPressed, setIsPTTPressed] = useState(false);
  const [speakingLevel, setSpeakingLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEditDestModal, setShowEditDestModal] = useState(false);
  const [newDestName, setNewDestName] = useState(voiceRoom.destinationName || '');
  const [isMicHardwareActive, setIsMicHardwareActive] = useState(false);

  // Initialize or update background session on mount or room change
  useEffect(() => {
    if (isBackgroundAudioActive) {
      audioEngine.startBackgroundSession(voiceRoom.name, voiceRoom.code, () => {
        handleToggleMute();
      });
    }
  }, [voiceRoom.name, voiceRoom.code, isBackgroundAudioActive]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMute(nextMuted);
    audioEngine.playRadioChirp(!nextMuted);

    // Update user status in room list
    const updatedParticipants = voiceRoom.participants.map((p) =>
      p.id === 'p-user' ? { ...p, isMuted: nextMuted } : p
    );
    onUpdateVoiceRoom({ participants: updatedParticipants });
  };

  const handleStartMicCapture = async () => {
    const success = await audioEngine.startMicrophone((speaking, level) => {
      setIsSpeaking(speaking);
      setSpeakingLevel(level);

      const updated = voiceRoom.participants.map((p) =>
        p.id === 'p-user' ? { ...p, isSpeaking: speaking } : p
      );
      onUpdateVoiceRoom({ participants: updated });
    });
    setIsMicHardwareActive(success);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setRoomVolume(newVol / 100);
  };

  // Push-To-Talk Handlers
  const handlePTTDown = () => {
    setIsPTTPressed(true);
    audioEngine.setMute(false);
    audioEngine.playRadioChirp(true);
    setIsSpeaking(true);

    const updated = voiceRoom.participants.map((p) =>
      p.id === 'p-user' ? { ...p, isSpeaking: true, isMuted: false } : p
    );
    onUpdateVoiceRoom({ participants: updated });
  };

  const handlePTTUp = () => {
    setIsPTTPressed(false);
    audioEngine.setMute(isMuted);
    audioEngine.playRadioChirp(false);
    setIsSpeaking(false);

    const updated = voiceRoom.participants.map((p) =>
      p.id === 'p-user' ? { ...p, isSpeaking: false, isMuted } : p
    );
    onUpdateVoiceRoom({ participants: updated });
  };

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/?room=${voiceRoom.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDestName.trim()) {
      onUpdateVoiceRoom({
        destinationName: newDestName.trim(),
        destinationLat: -23.9856,
        destinationLng: -46.7412,
      });
      setShowEditDestModal(false);
    }
  };

  const handleSimulateIncomingRadio = () => {
    audioEngine.playSimulatedIncomingRadio(
      'Marcos Viana (Líder)',
      'Atenção comboio, radar de 80 km/h logo após a curva do KM 32. Mantenham a formação em zigue-zague!'
    );
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-4xl mx-auto px-3 sm:px-4 py-3">
      {/* Voice Room Header & Info */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
                  {voiceRoom.name}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                  CANAL {voiceRoom.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Líder: {voiceRoom.creatorName} • {voiceRoom.participants.length} pilotos conectados
              </p>
            </div>
          </div>

          {/* Quick QR Code and Invite Link buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowQRModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
              title="Exibir QR Code para escanear"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              QR Code
            </button>
            <button
              onClick={handleCopyInviteLink}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
              title="Copiar link de convite da sala"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              {copiedLink ? 'Copiado!' : 'Link'}
            </button>
          </div>
        </div>

        {/* Background Audio Keepalive Toggle Banner */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isBackgroundAudioActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
            <div>
              <p className="text-xs font-bold text-slate-200">
                Transmissão em Segundo Plano (Tela Bloqueada)
              </p>
              <p className="text-[11px] text-slate-400">
                Mantém o intercomunicador ativo mesmo com Waze aberto ou celular bloqueado.
              </p>
            </div>
          </div>
          <button
            onClick={() => onToggleBackgroundSession(!isBackgroundAudioActive)}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl font-bold text-xs transition active:scale-95 text-center shrink-0 ${
              isBackgroundAudioActive
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {isBackgroundAudioActive ? 'Ativo' : 'Ativar'}
          </button>
        </div>
      </div>

      {/* Primary Transit Voice Controls (Ergonomic, High Contrast) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Big Mute/Unmute Button */}
        <button
          onClick={handleToggleMute}
          className={`py-5 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
            isMuted
              ? 'bg-slate-900 border-2 border-amber-500/40 text-slate-200 hover:bg-slate-850'
              : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-emerald-950/50'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            {isMuted ? <MicOff className="w-7 h-7 text-amber-400" /> : <Mic className="w-7 h-7" />}
          </div>
          <span className="text-sm font-black uppercase tracking-wider">
            {isMuted ? 'Microfone Mudo (Toque p/ Ativar)' : 'Microfone Aberto'}
          </span>
          <span className="text-[11px] text-slate-300/80 font-mono">
            {isMuted ? 'Canal em escuta silenciosa' : 'Você está transmitindo no comboio'}
          </span>
        </button>

        {/* Push-To-Talk (PTT) Hold-to-Talk Button */}
        <button
          onMouseDown={handlePTTDown}
          onMouseUp={handlePTTUp}
          onTouchStart={handlePTTDown}
          onTouchEnd={handlePTTUp}
          className={`py-5 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all select-none active:scale-95 shadow-lg ${
            isPTTPressed
              ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/50'
              : 'bg-slate-900 border border-slate-800 text-slate-200 hover:border-amber-500/40'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Radio className={`w-7 h-7 ${isPTTPressed ? 'animate-pulse text-slate-950' : 'text-amber-400'}`} />
          </div>
          <span className="text-sm font-black uppercase tracking-wider">
            {isPTTPressed ? 'Transmitindo no Rádio...' : 'Segure para Falar (PTT)'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {isPTTPressed ? 'Liberte para fechar canal' : 'Pressione e fale como num rádio'}
          </span>
        </button>

        {/* Master Volume & Real Mic Capture Activation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-500" />
                Volume do Intercom
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">{volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Test Hardware Mic / Speech */}
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
            {!isMicHardwareActive ? (
              <button
                onClick={handleStartMicCapture}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-2 transition"
              >
                <Headphones className="w-3.5 h-3.5 text-amber-400" />
                Conectar Microfone Físico
              </button>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-mono">
                <span>Microfone Físico Ativo</span>
                <span>Nível: {speakingLevel}%</span>
              </div>
            )}

            <button
              onClick={handleSimulateIncomingRadio}
              className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700/80 flex items-center justify-center gap-2 transition"
              title="Simula mensagem de rádio por voz do líder"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Simular Chamada do Líder
            </button>
          </div>
        </div>
      </div>

      {/* External Navigation Destination (Waze & Google Maps) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Destino Cadastrado do Comboio
            </h3>
          </div>
          <button
            onClick={() => setShowEditDestModal(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            Alterar Destino
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-white">
                {voiceRoom.destinationName || 'Ponto de Chegada não configurado'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Toque no app de navegação de sua preferência para abrir a rota mantendo o áudio em 2º plano:
              </p>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getWazeNavigationUrl(voiceRoom.destinationLat || -23.9856, voiceRoom.destinationLng || -46.7412)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <span>Waze</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={getGoogleMapsNavigationUrl(voiceRoom.destinationLat || -23.9856, voiceRoom.destinationLng || -46.7412)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Integrantes no Comboio ({voiceRoom.participants.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Latência: ~45ms</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {voiceRoom.participants.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Speaking indicator dot */}
                <div className="relative">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    p.isSpeaking ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {p.name.charAt(0)}
                  </div>
                  {p.isSpeaking && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-200">{p.name}</p>
                    {p.isHost && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        Líder
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>Distância: {p.distanceToHostKm === 0 ? 'Ponto Base' : `${p.distanceToHostKm} km`}</span>
                    <span>•</span>
                    <span className="capitalize">{p.deviceType || 'intercom'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {p.isSpeaking ? (
                  <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Falando...
                  </span>
                ) : p.isMuted ? (
                  <MicOff className="w-4 h-4 text-slate-500" />
                ) : (
                  <Mic className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-center">
            <h3 className="text-base font-extrabold text-white mb-1">Ingressar no Comboio</h3>
            <p className="text-xs text-slate-400 mb-4">
              Aponte a câmera do celular para entrar diretamente na sala de voz:
            </p>

            {/* Generated High-Contrast SVG QR code representation */}
            <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-4">
              <svg className="w-48 h-48" viewBox="0 0 100 100" fill="#0f172a">
                {/* Corner markers */}
                <rect x="5" y="5" width="25" height="25" fill="#0f172a" />
                <rect x="8" y="8" width="19" height="19" fill="#ffffff" />
                <rect x="11" y="11" width="13" height="13" fill="#0f172a" />

                <rect x="70" y="5" width="25" height="25" fill="#0f172a" />
                <rect x="73" y="8" width="19" height="19" fill="#ffffff" />
                <rect x="76" y="11" width="13" height="13" fill="#0f172a" />

                <rect x="5" y="70" width="25" height="25" fill="#0f172a" />
                <rect x="8" y="73" width="19" height="19" fill="#ffffff" />
                <rect x="11" y="76" width="13" height="13" fill="#0f172a" />

                {/* Data blocks */}
                <rect x="35" y="10" width="8" height="8" />
                <rect x="48" y="15" width="8" height="8" />
                <rect x="40" y="35" width="20" height="8" />
                <rect x="15" y="45" width="10" height="10" />
                <rect x="75" y="45" width="12" height="8" />
                <rect x="45" y="55" width="12" height="12" />
                <rect x="65" y="65" width="8" height="16" />
                <rect x="40" y="75" width="10" height="10" />
              </svg>
            </div>

            <p className="font-mono text-sm font-bold text-amber-400 mb-4 tracking-wider">
              CÓDIGO: {voiceRoom.code}
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleCopyInviteLink}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700"
              >
                {copiedLink ? 'Link Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Destination Modal */}
      {showEditDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl">
            <h3 className="text-sm font-extrabold text-white mb-2">Cadastrar Destino do Comboio</h3>
            <p className="text-xs text-slate-400 mb-4">
              Informe o ponto final para que todos os pilotos possam abrir a rota no Waze ou Google Maps com um toque.
            </p>
            <form onSubmit={handleSaveDestination} className="space-y-3">
              <input
                type="text"
                value={newDestName}
                onChange={(e) => setNewDestName(e.target.value)}
                placeholder="Ex: Serra da Graciosa, Morretes - PR"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditDestModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
                >
                  Salvar Destino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
