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
  Lock,
  X,
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
  const [showLockWarning, setShowLockWarning] = useState(
    () => !storageService.isLockWarningDismissed()
  );

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

  /**
   * Convidar alguém para o comboio.
   *
   * No celular usa a folha de compartilhamento do sistema, que cai direto no
   * WhatsApp — que é por onde um convite de comboio realmente circula. Onde
   * isso não existe, copia o link.
   */
  const handleShareConvoy = async () => {
    const texto = `Entra no meu comboio no MotoRede

Código: ${activeRoomCode}
${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Comboio MotoRede', text: texto, url: inviteUrl });
        return;
      } catch {
        // Cancelado pelo usuário ou indisponível: segue para a cópia.
      }
    }

    handleCopyInviteLink();
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
      {/* Aviso sobre tela bloqueada.
          Sem ele o piloto bloqueia a tela, continua ouvindo todo mundo, e
          conclui que o app quebrou quando ninguém responde — o sintoma esconde
          a causa, porque a direção que falha é a que ele não percebe.

          Mostrado em todo celular, de propósito. Medimos um iPhone 15 em que as
          duas direções sobrevivem ao bloqueio e um Samsung A07 em que não; um
          aparelho de cada não sustenta uma regra por sistema operacional. Um
          aviso ocasionalmente desnecessário custa menos que alguém falhando em
          silêncio na estrada. */}
      {isMobileDevice && showLockWarning && (
        <div className="rounded-2xl bg-brand/10 border border-brand/30 p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-brand-soft shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-brand-soft mb-1">
                No celular, fale com a tela ligada
              </p>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Ao bloquear a tela, em boa parte dos aparelhos você{' '}
                <strong>continua ouvindo</strong> o comboio mas{' '}
                <strong>para de transmitir</strong>. Depende do modelo, e é limite do
                navegador, não do MotoRede. Para não depender disso, mantenha a tela
                ligada ou use o aplicativo.
              </p>
              <a
                href={`motorede://sala/${activeRoomCode}`}
                className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg bg-brand text-on-brand text-[11px] font-bold transition active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Abrir no app
              </a>
            </div>
            <button
              onClick={() => {
                storageService.dismissLockWarning();
                setShowLockWarning(false);
              }}
              className="p-1 rounded-lg hover:bg-brand/20 text-brand-soft/70 shrink-0 transition"
              aria-label="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Identificação do piloto. Só aparece se o login estiver configurado,
          para o app não quebrar em ambiente sem a credencial do Google. */}
      {auth.isConfigured && (
        <div className="rounded-2xl bg-surface/80 border border-line p-4">
          {auth.user ? (
            <div className="flex items-center gap-3">
              {auth.user.picture && (
                <img
                  src={auth.user.picture}
                  alt=""
                  className="w-9 h-9 rounded-xl border border-line-strong"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink truncate">
                  {auth.user.name}
                </p>
                <p className="text-[11px] text-ink-muted truncate">{auth.user.email}</p>
              </div>
              <button
                onClick={auth.signOut}
                className="px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink-muted text-xs font-semibold border border-line-strong transition active:scale-95"
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink">
                  Entre para aparecer com seu nome
                </p>
                <p className="text-[11px] text-ink-muted">
                  Sem login você entra como piloto anônimo.
                </p>
              </div>
              <div ref={googleButtonRef} className="shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* Conexão de voz real (LiveKit) */}
      <div className="rounded-2xl bg-surface/80 border border-line p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                voice.status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : voice.status === 'connecting' || voice.status === 'reconnecting'
                    ? 'bg-brand animate-pulse'
                    : voice.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-line-strong'
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">
                {voice.status === 'connected' && 'Voz ao vivo — conectado ao servidor'}
                {voice.status === 'connecting' && 'Conectando...'}
                {voice.status === 'reconnecting' && 'Reconectando...'}
                {voice.status === 'error' && 'Falha ao conectar'}
                {voice.status === 'disconnected' && 'Voz ao vivo — desconectado'}
              </p>
              <p className="text-[11px] text-ink-muted truncate">
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
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-semibold border border-line-strong transition active:scale-95"
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
                  : 'bg-brand text-on-brand hover:opacity-90'
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
          <div className="mt-4 pt-3 border-t border-line/80 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[11px] text-ink-muted uppercase tracking-wider font-mono">
                  Comboio
                </p>
                <p className="text-xl font-extrabold text-brand-soft font-mono tracking-widest">
                  {activeRoomCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBrowser(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-semibold border border-line-strong transition active:scale-95"
                  title="Ver comboios ativos e achar um piloto"
                >
                  <Compass className="w-4 h-4 text-brand-soft" />
                  Comboios
                </button>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-semibold border border-line-strong transition active:scale-95"
                  title="Exibir QR Code do convite"
                >
                  <QrCode className="w-4 h-4 text-brand-soft" />
                  QR
                </button>
                <button
                  onClick={handleShareConvoy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-semibold border border-line-strong transition active:scale-95"
                  title="Convidar para este comboio"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-ink-muted" />
                  )}
                  {copiedLink ? 'Copiado' : 'Link'}
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-semibold border border-line-strong transition active:scale-95"
                >
                  <Plus className="w-4 h-4 text-brand-soft" />
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
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-canvas border border-line-strong text-ink text-sm font-mono uppercase placeholder:font-sans placeholder:normal-case placeholder:text-ink-faint focus:outline-none focus:border-brand/60"
              />
              <button
                type="submit"
                disabled={!codeInput.trim()}
                className="px-4 py-2 rounded-xl bg-elevated hover:bg-line-strong disabled:opacity-40 text-ink text-xs font-bold border border-line-strong transition active:scale-95"
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
                className="w-full px-3 py-2 rounded-xl bg-canvas border border-line-strong text-ink text-sm placeholder:text-ink-faint focus:outline-none focus:border-brand/60"
              />
              <p className="text-[10px] text-ink-faint mt-1.5 leading-relaxed">
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
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand/10 text-brand-soft border border-brand/30 text-xs font-bold hover:bg-brand/20 transition"
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
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand/15 text-brand-soft border border-brand/30 text-xs font-bold hover:bg-brand/25 transition"
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
        <div className="rounded-2xl bg-gradient-to-b from-surface to-canvas border border-line p-4 sm:p-5 shadow-xl space-y-4">
          <div>
            {/* Mudo — atua na conexão real, não no simulador */}
            <button
              onClick={() => voice.setMuted(!voice.isMuted)}
              className={`w-full py-5 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                voice.isMuted
                  ? 'bg-surface border-2 border-brand/40 text-ink'
                  : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-emerald-950/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                {voice.isMuted ? (
                  <MicOff className="w-7 h-7 text-brand-soft" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </div>
              <span className="text-sm font-black uppercase tracking-wider text-center">
                {voice.isMuted ? 'Microfone mudo' : 'Microfone aberto'}
              </span>
              <span
                className={`text-[11px] font-mono text-center ${
                  voice.isMuted ? 'text-ink-muted' : 'text-white/80'
                }`}
              >
                {voice.isMuted ? 'Você ouve, mas não transmite' : 'Você está transmitindo'}
              </span>
            </button>

          </div>

          {/* Convidar. Antes isto vivia só na seleção de comboio, que some ao
              conectar — ou seja, sumia justamente na hora de chamar um amigo. */}
          <div className="flex items-center gap-2 pt-1">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider font-mono">
                Código do comboio
              </p>
              <p className="text-lg font-extrabold text-brand-soft font-mono tracking-widest">
                {activeRoomCode}
              </p>
            </div>
            <button
              onClick={() => setShowQRModal(true)}
              className="p-2.5 rounded-xl bg-elevated hover:bg-line-strong text-ink border border-line-strong transition active:scale-95"
              title="QR Code do convite"
            >
              <QrCode className="w-4 h-4 text-brand-soft" />
            </button>
            <button
              onClick={handleShareConvoy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand hover:opacity-90 text-on-brand text-xs font-bold transition active:scale-95"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copiedLink ? 'Copiado' : 'Convidar'}
            </button>
          </div>

          {/* Volume dos outros pilotos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ink-muted flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-brand" />
                Volume do comboio
              </span>
              <span className="text-xs font-mono font-bold text-brand-soft">
                {voice.volume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={voice.volume}
              onChange={(e) => voice.setVolume(Number(e.target.value))}
              className="w-full accent-brand h-2 bg-elevated rounded-lg cursor-pointer"
            />
          </div>

          {/* Quem está no comboio */}
          <div className="pt-3 border-t border-line/80">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
                No comboio ({voice.participants.length})
              </h3>
            </div>

            <div className="divide-y divide-line/60">
              {voice.participants.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      p.isSpeaking
                        ? 'bg-brand text-on-brand ring-2 ring-brand-soft'
                        : 'bg-elevated text-ink-muted'
                    }`}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">
                      {p.name}
                      {p.isHost && (
                        <span className="text-[10px] text-brand-soft font-mono ml-1.5">
                          LÍDER
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {p.isMuted ? 'mudo' : p.isSpeaking ? 'falando' : 'ouvindo'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transmissão em segundo plano */}
          <div className="pt-3 border-t border-line/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isBackgroundAudioActive ? 'bg-emerald-400 animate-pulse' : 'bg-line-strong'
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink">Tela bloqueada</p>
                <p className="text-[11px] text-ink-muted truncate">
                  Mantém a conversa com o celular no bolso.
                </p>
              </div>
            </div>
            <button
              onClick={() => onToggleBackgroundSession(!isBackgroundAudioActive)}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition active:scale-95 shrink-0 ${
                isBackgroundAudioActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-elevated text-ink-muted hover:bg-line-strong border border-line-strong'
              }`}
            >
              {isBackgroundAudioActive ? 'Ativo' : 'Ativar'}
            </button>
          </div>
        </div>
      )}

      {/* External Navigation Destination (Waze & Google Maps) */}
      <div className="rounded-2xl bg-surface/80 border border-line p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Destino Cadastrado do Comboio
            </h3>
          </div>
          <button
            onClick={() => setShowEditDestModal(true)}
            className="text-xs text-brand-soft hover:text-brand-soft font-semibold"
          >
            Alterar Destino
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas/80 p-3.5 rounded-xl border border-line/80">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-ink">
                {voiceRoom.destinationName || 'Ponto de Chegada não configurado'}
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">
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
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-5 shadow-2xl text-center">
            <h3 className="text-base font-extrabold text-ink mb-1">Ingressar no Comboio</h3>
            <p className="text-xs text-ink-muted mb-4">
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
                <div className="w-48 h-48 flex items-center justify-center text-ink-muted text-xs">
                  Gerando...
                </div>
              )}
            </div>

            <p className="font-mono text-sm font-bold text-brand-soft mb-4 tracking-wider">
              CÓDIGO: {activeRoomCode}
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleCopyInviteLink}
                className="flex-1 py-2 px-3 bg-elevated hover:bg-line-strong text-ink text-xs font-bold rounded-lg border border-line-strong"
              >
                {copiedLink ? 'Link Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 py-2 px-3 bg-brand hover:opacity-90 text-on-brand text-xs font-bold rounded-lg"
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
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-5 shadow-2xl">
            <h3 className="text-sm font-extrabold text-ink mb-2">Cadastrar Destino do Comboio</h3>
            <p className="text-xs text-ink-muted mb-4">
              Informe o ponto final para que todos os pilotos possam abrir a rota no Waze ou Google Maps com um toque.
            </p>
            <form onSubmit={handleSaveDestination} className="space-y-3">
              <input
                type="text"
                value={newDestName}
                onChange={(e) => setNewDestName(e.target.value)}
                placeholder="Ex: Serra da Graciosa, Morretes - PR"
                className="w-full bg-canvas border border-line-strong rounded-lg p-2.5 text-xs text-ink focus:outline-none focus:border-brand"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditDestModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-elevated text-ink-muted text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-brand text-on-brand font-bold text-xs hover:opacity-90"
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
