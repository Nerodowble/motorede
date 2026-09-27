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
import { codigoInicialDoComboio, compartilharConvite, linkDoConvite } from '../services/convoyInvite';
import { ConvoyDestinationCard } from '../components/ConvoyDestinationCard';
import { ConvoyQRModal } from '../components/ConvoyQRModal';
import { useVoiceConnection } from '../hooks/useVoiceConnection';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { ConvoyBrowser } from '../components/ConvoyBrowser';
import { PluginPanel } from '../components/PluginPanel';
import { usePluginAudio } from '../hooks/usePluginAudio';

interface ConvoyVoiceViewProps {
  voiceRoom: VoiceRoom;
  onUpdateVoiceRoom: (updated: Partial<VoiceRoom>) => void;
  isBackgroundAudioActive: boolean;
  onToggleBackgroundSession: (active: boolean) => void;
  /**
   * Pedido do painel inicial para conectar assim que a tela abrir ("Entrar no
   * comboio" com um toque). A conexão continua sendo UMA, a deste componente:
   * o painel só pede, não conecta por conta própria.
   */
  entrarAoAbrir?: boolean;
  /** Avisa que o pedido foi atendido, para não reconectar numa volta à aba. */
  onEntradaAutomaticaFeita?: () => void;
}

export const ConvoyVoiceView: React.FC<ConvoyVoiceViewProps> = ({
  voiceRoom,
  onUpdateVoiceRoom,
  isBackgroundAudioActive,
  onToggleBackgroundSession,
  entrarAoAbrir,
  onEntradaAutomaticaFeita,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Conexão de voz real contra o servidor LiveKit.
  const voice = useVoiceConnection();
  const auth = useGoogleAuth();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const isLive = voice.status === 'connected' || voice.status === 'reconnecting';
  const pluginAudio = usePluginAudio(voice.room, voice.sessionToken);
  const souLider = voice.participants.some(
    (p) => p.isHost && p.id === voice.room?.localParticipant.identity
  );

  // Código do comboio ativo. A precedência (convite ?sala= antes do último
  // comboio salvo) mora em convoyInvite, para o painel mostrar o mesmo código.
  const [activeRoomCode, setActiveRoomCode] = useState<string>(() =>
    codigoInicialDoComboio(voiceRoom.code)
  );
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [phone, setPhone] = useState(() => storageService.getPhone());
  const [showLockWarning, setShowLockWarning] = useState(
    () => !storageService.isLockWarningDismissed()
  );

  const inviteUrl = linkDoConvite(activeRoomCode);

  // Detecção simples de celular: basta para decidir se vale oferecer o app.
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);


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

  // "Entrar no comboio" do painel: conecta uma vez, ao abrir. O ref segura o
  // StrictMode (que roda o efeito duas vezes em desenvolvimento) e qualquer
  // nova renderização — sem ele sairia uma segunda tentativa de conexão.
  const entradaAutomaticaFeita = useRef(false);
  useEffect(() => {
    if (!entrarAoAbrir || entradaAutomaticaFeita.current) return;
    entradaAutomaticaFeita.current = true;
    onEntradaAutomaticaFeita?.();
    if (voice.status === 'disconnected' || voice.status === 'error') void handleToggleLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrarAoAbrir]);

  const marcarCopiado = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    marcarCopiado();
  };

  // O texto e a regra (folha do sistema no celular, cópia no resto) ficam em
  // convoyInvite, compartilhados com o botão Convidar do painel.
  const handleShareConvoy = async () => {
    if ((await compartilharConvite(activeRoomCode)) === 'copiado') marcarCopiado();
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
        <div className="rounded-2xl bg-warning/10 border border-warning/30 p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-warning mb-1">
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
                className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg bg-action text-on-action text-[11px] font-bold transition active:scale-95"
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
                  ? 'bg-live animate-pulse'
                  : voice.status === 'connecting' || voice.status === 'reconnecting'
                    ? 'bg-warning animate-pulse'
                    : voice.status === 'error'
                      ? 'bg-sos'
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
              {/* Erro quebra linha: a explicação (ex.: como liberar o microfone
                  no iPhone) não pode sumir num "…". */}
              <p
                className={`text-[11px] ${voice.error ? 'text-danger whitespace-normal' : 'text-ink-muted truncate'}`}
              >
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
                  <MicOff className="w-4 h-4 text-danger" />
                ) : (
                  <Mic className="w-4 h-4 text-success" />
                )}
                {voice.isMuted ? 'Reativar' : 'Mudo'}
              </button>
            )}
            <button
              onClick={handleToggleLive}
              disabled={voice.status === 'connecting'}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 ${
                isLive
                  ? 'bg-sos/15 text-danger border border-danger/30 hover:bg-sos/25'
                  : 'bg-action text-on-action hover:opacity-90'
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
                <p className="text-xl font-extrabold text-code font-mono tracking-widest">
                  {activeRoomCode}
                </p>
              </div>
              {/* flex-wrap: em 360px os quatro botões não cabem numa linha e o
                  "Novo" era cortado pela borda da tela. */}
              <div className="flex items-center gap-2 flex-wrap">
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
                    <Check className="w-4 h-4 text-success" />
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

            {codeError && <p className="text-[11px] text-danger">{codeError}</p>}

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
                  ? 'bg-surface border-2 border-warning/40 text-ink'
                  : 'bg-gradient-to-br from-live to-live text-white shadow-live/30'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                {voice.isMuted ? (
                  <MicOff className="w-7 h-7 text-warning" />
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
              <p className="text-lg font-extrabold text-code font-mono tracking-widest">
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-action hover:opacity-90 text-on-action text-xs font-bold transition active:scale-95"
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
                        ? 'bg-speaking text-on-speaking ring-2 ring-speaking/60'
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
                  isBackgroundAudioActive ? 'bg-live animate-pulse' : 'bg-line-strong'
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
                  ? 'bg-live text-white'
                  : 'bg-elevated text-ink-muted hover:bg-line-strong border border-line-strong'
              }`}
            >
              {isBackgroundAudioActive ? 'Ativo' : 'Ativar'}
            </button>
          </div>
        </div>
      )}

      {/* Plugin de áudio do comboio. Some por completo fora da conversa. */}
      {isLive && <PluginPanel pluginAudio={pluginAudio} souLider={souLider} />}

      {/* Destino e atalhos de rota (Waze / Google Maps). */}
      <ConvoyDestinationCard voiceRoom={voiceRoom} onUpdateVoiceRoom={onUpdateVoiceRoom} />

      <ConvoyBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        activeRoomCode={activeRoomCode}
        onJoinConvoy={handleJoinFromBrowser}
        idToken={auth.getIdToken()}
      />

      <ConvoyQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        roomCode={activeRoomCode}
        copiado={copiedLink}
        onCopiarLink={handleCopyInviteLink}
      />
    </div>
  );
};
