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
  Compass,
} from 'lucide-react';
import {
  VoiceRoom,
  VoiceParticipant,
  generateRoomCode,
  normalizeRoomCode,
  isJoinableRoomCode,
} from '@motorede/shared';
import { storageService } from '../services/storage';
import { getGoogleMapsNavigationUrl, getWazeNavigationUrl } from '../services/geolocation';
import QRCode from 'qrcode';
import { useVoiceConnection } from '../hooks/useVoiceConnection';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { ConvoyBrowser } from '../components/ConvoyBrowser';

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
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEditDestModal, setShowEditDestModal] = useState(false);
  const [newDestName, setNewDestName] = useState(voiceRoom.destinationName || '');

  // Conexão de voz real contra o servidor LiveKit.
  const voice = useVoiceConnection();
  const auth = useGoogleAuth();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const isLive = voice.status === 'connected' || voice.status === 'reconnecting';

  // Código do comboio ativo. A ordem de precedência importa: um link de convite
  // (?sala=) tem que vencer o último comboio salvo, senão quem recebe o convite
  // cai na própria sala anterior em vez da do amigo.
  const [activeRoomCode, setActiveRoomCode] = useState<string>(() => {
    const fromLink = new URLSearchParams(window.location.search).get('sala');
    if (fromLink) {
      const normalized = normalizeRoomCode(fromLink);
      if (isJoinableRoomCode(normalized)) return normalized;
    }
    return storageService.getLastRoomCode() || voiceRoom.code;
  });
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [phone, setPhone] = useState(() => storageService.getPhone());

  const inviteUrl = `${window.location.origin}/?sala=${activeRoomCode}`;

  // Detecção simples de celular: basta para decidir se vale oferecer o app.
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Gera o QR de verdade quando o modal abre ou o comboio muda.
  useEffect(() => {
    if (!showQRModal) return;
    let cancelled = false;

    QRCode.toDataURL(inviteUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [showQRModal, inviteUrl]);

  useEffect(() => {
    if (!auth.user) auth.renderButton(googleButtonRef.current);
  }, [auth.isReady, auth.user, auth.renderButton]);

  // Enquanto não há conexão real, a tela segue mostrando os participantes de
  // demonstração. Conectado, passa a refletir quem está de fato na sala.
  const displayParticipants: VoiceParticipant[] = isLive
    ? voice.participants
    : voiceRoom.participants;

  const enterRoom = (code: string) => {
    setActiveRoomCode(code);
    storageService.saveLastRoomCode(code);
    setCodeInput('');
    setCodeError(null);
  };

  const handleJoinFromBrowser = async (code: string) => {
    // Nunca duas chamadas ao mesmo tempo: sai de uma para entrar na outra.
    if (isLive) await voice.disconnect();
    enterRoom(code);
    setShowBrowser(false);
    await voice.connect({
      roomCode: code,
      identity: `piloto-${Math.random().toString(36).slice(2, 8)}`,
      displayName: auth.user?.name || 'Você (Piloto)',
      idToken: auth.getIdToken(),
      phone: phone || undefined,
    });
  };

  const handleCreateRoom = () => {
    enterRoom(generateRoomCode());
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(codeInput);
    if (!isJoinableRoomCode(normalized)) {
      setCodeError('Código inválido. Confira com quem te passou.');
      return;
    }
    enterRoom(normalized);
  };

  const handleToggleLive = async () => {
    if (isLive) {
      await voice.disconnect();
      return;
    }
    await voice.connect({
      roomCode: activeRoomCode,
      identity: `piloto-${Math.random().toString(36).slice(2, 8)}`,
      displayName: auth.user?.name || 'Você (Piloto)',
      idToken: auth.getIdToken(),
      phone: phone || undefined,
    });
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
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

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-4xl mx-auto px-3 sm:px-4 py-3">
      {/* Identificação do piloto. Só aparece se o login estiver configurado,
          para o app não quebrar em ambiente sem a credencial do Google. */}
      {auth.isConfigured && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
          {auth.user ? (
            <div className="flex items-center gap-3">
              {auth.user.picture && (
                <img
                  src={auth.user.picture}
                  alt=""
                  className="w-9 h-9 rounded-xl border border-slate-700"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100 truncate">
                  {auth.user.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{auth.user.email}</p>
              </div>
              <button
                onClick={auth.signOut}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition active:scale-95"
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-200">
                  Entre para aparecer com seu nome
                </p>
                <p className="text-[11px] text-slate-400">
                  Sem login você entra como piloto anônimo.
                </p>
              </div>
              <div ref={googleButtonRef} className="shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* Conexão de voz real (LiveKit) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                voice.status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : voice.status === 'connecting' || voice.status === 'reconnecting'
                    ? 'bg-amber-400 animate-pulse'
                    : voice.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-slate-600'
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200">
                {voice.status === 'connected' && 'Voz ao vivo — conectado ao servidor'}
                {voice.status === 'connecting' && 'Conectando...'}
                {voice.status === 'reconnecting' && 'Reconectando...'}
                {voice.status === 'error' && 'Falha ao conectar'}
                {voice.status === 'disconnected' && 'Voz ao vivo — desconectado'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {voice.error
                  ? voice.error
                  : isLive
                    ? `Canal ${activeRoomCode} • microfone ${voice.isMuted ? 'mudo' : 'aberto'}${voice.serverHost ? ` • ${voice.serverHost}` : ''}`
                    : 'Lista abaixo em modo demonstração até conectar.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isLive && (
              <button
                onClick={() => voice.setMuted(!voice.isMuted)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
              >
                {voice.isMuted ? (
                  <MicOff className="w-4 h-4 text-red-400" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-400" />
                )}
                {voice.isMuted ? 'Reativar' : 'Mudo'}
              </button>
            )}
            <button
              onClick={handleToggleLive}
              disabled={voice.status === 'connecting'}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 ${
                isLive
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              }`}
            >
              <Signal className="w-4 h-4" />
              {isLive ? 'Sair do canal' : 'Entrar no canal'}
            </button>
          </div>
        </div>

        {/* Seleção de comboio — some enquanto a conversa está ativa, para não
            oferecer troca de sala com o piloto em movimento. */}
        {!isLive && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                  Comboio
                </p>
                <p className="text-xl font-extrabold text-amber-400 font-mono tracking-widest">
                  {activeRoomCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBrowser(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
                  title="Ver comboios ativos e achar um piloto"
                >
                  <Compass className="w-4 h-4 text-amber-400" />
                  Comboios
                </button>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
                  title="Exibir QR Code do convite"
                >
                  <QrCode className="w-4 h-4 text-amber-400" />
                  QR
                </button>
                <button
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
                  title="Copiar link de convite"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                  {copiedLink ? 'Copiado' : 'Link'}
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  Novo
                </button>
              </div>
            </div>

            <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
              <input
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setCodeError(null);
                }}
                placeholder="Entrar com código (ex: K7M-3PQ)"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm font-mono uppercase placeholder:font-sans placeholder:normal-case placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
              />
              <button
                type="submit"
                disabled={!codeInput.trim()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold border border-slate-700 transition active:scale-95"
              >
                Entrar
              </button>
            </form>

            {codeError && <p className="text-[11px] text-red-400">{codeError}</p>}

            {/* Telefone: fica só neste aparelho. Serve para um amigo que já tem
                o seu número conseguir te achar entre os comboios do evento. */}
            <div>
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  storageService.savePhone(e.target.value);
                }}
                placeholder="Seu telefone (opcional, para amigos te acharem)"
                inputMode="tel"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                Guardado só neste aparelho. Quem já tem seu número consegue te
                encontrar; ninguém consegue ler telefones.
              </p>
            </div>

            {/* Quem abriu o convite no celular provavelmente quer o app, que é
                onde a voz sobrevive à tela bloqueada. Só aparece em celular:
                num desktop o link não levaria a lugar nenhum. */}
            {isMobileDevice && (
              <a
                href={`motorede://sala/${activeRoomCode}`}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/20 transition"
              >
                <Smartphone className="w-4 h-4" />
                Abrir no app MotoRede
              </a>
            )}
          </div>
        )}

        {/* Navegadores bloqueiam áudio até um gesto do usuário. */}
        {voice.needsAudioUnlock && (
          <button
            onClick={() => voice.unlockAudio()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 transition"
          >
            <Volume2 className="w-4 h-4" />
            Tocar para liberar o áudio
          </button>
        )}
      </div>

      {/* Controles da chamada. Só aparecem com a conversa ativa — fora dela
          não há o que controlar, e mostrá-los desligados era o que dava a
          impressão de tela quebrada. */}
      {isLive && (
        <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mudo — agora atua na conexão real, não no simulador */}
            <button
              onClick={() => voice.setMuted(!voice.isMuted)}
              className={`py-5 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                voice.isMuted
                  ? 'bg-slate-900 border-2 border-amber-500/40 text-slate-200'
                  : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-emerald-950/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                {voice.isMuted ? (
                  <MicOff className="w-7 h-7 text-amber-400" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </div>
              <span className="text-sm font-black uppercase tracking-wider text-center">
                {voice.isMuted ? 'Microfone mudo' : 'Microfone aberto'}
              </span>
              <span className="text-[11px] text-slate-300/80 font-mono text-center">
                {voice.isMuted ? 'Você ouve, mas não transmite' : 'Você está transmitindo'}
              </span>
            </button>

            {/* Segure para falar: abre o microfone enquanto pressionado e
                fecha ao soltar. Útil para quem prefere manter tudo mudo. */}
            <button
              onPointerDown={() => voice.setMuted(false)}
              onPointerUp={() => voice.setMuted(true)}
              onPointerLeave={() => voice.isMuted || voice.setMuted(true)}
              className="py-5 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all select-none active:scale-95 shadow-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-amber-500/40 active:bg-amber-500 active:text-slate-950"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Radio className="w-7 h-7 text-amber-400" />
              </div>
              <span className="text-sm font-black uppercase tracking-wider text-center">
                Segure para falar
              </span>
              <span className="text-[11px] text-slate-400 font-mono text-center">
                Solte para fechar o canal
              </span>
            </button>
          </div>

          {/* Volume dos outros pilotos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-500" />
                Volume do comboio
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {voice.volume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={voice.volume}
              onChange={(e) => voice.setVolume(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Quem está no comboio */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                No comboio ({voice.participants.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-800/60">
              {voice.participants.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      p.isSpeaking
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {p.name}
                      {p.isHost && (
                        <span className="text-[10px] text-amber-400 font-mono ml-1.5">
                          LÍDER
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {p.isMuted ? 'mudo' : p.isSpeaking ? 'falando' : 'ouvindo'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transmissão em segundo plano */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isBackgroundAudioActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200">Tela bloqueada</p>
                <p className="text-[11px] text-slate-400 truncate">
                  Mantém a conversa com o celular no bolso.
                </p>
              </div>
            </div>
            <button
              onClick={() => onToggleBackgroundSession(!isBackgroundAudioActive)}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition active:scale-95 shrink-0 ${
                isBackgroundAudioActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {isBackgroundAudioActive ? 'Ativo' : 'Ativar'}
            </button>
          </div>
        </div>
      )}

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

      <ConvoyBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        activeRoomCode={activeRoomCode}
        onJoinConvoy={handleJoinFromBrowser}
        idToken={auth.getIdToken()}
      />

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-center">
            <h3 className="text-base font-extrabold text-white mb-1">Ingressar no Comboio</h3>
            <p className="text-xs text-slate-400 mb-4">
              Aponte a câmera do celular para entrar diretamente na sala de voz:
            </p>

            <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code do comboio ${activeRoomCode}`}
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  Gerando...
                </div>
              )}
            </div>

            <p className="font-mono text-sm font-bold text-amber-400 mb-4 tracking-wider">
              CÓDIGO: {activeRoomCode}
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
