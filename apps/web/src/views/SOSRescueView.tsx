import React, { useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  Clock,
  Radio,
  Navigation,
  Send,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Phone,
  MessageSquare,
  Wrench,
  Users,
  Compass,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { SOSAlert, EmergencyType, SOSVolunteer } from '@motorede/shared';
import { GeoPoint, calculateDistanceKm, formatDistance, getGoogleMapsNavigationUrl, getWazeNavigationUrl } from '../services/geolocation';
import { storageService } from '../services/storage';

interface SOSRescueViewProps {
  userCoords: GeoPoint;
  motorcycleInfo: string;
  sosAlerts: SOSAlert[];
  onTriggerSOS: (type: EmergencyType, details: string, reference: string, radiusKm: number) => void;
  onRespondToSOS: (alertId: string) => void;
  onSendMessage: (alertId: string, text: string) => void;
  onResolveSOS: (alertId: string) => void;
}

export const SOSRescueView: React.FC<SOSRescueViewProps> = ({
  userCoords,
  motorcycleInfo,
  sosAlerts,
  onTriggerSOS,
  onRespondToSOS,
  onSendMessage,
  onResolveSOS,
}) => {
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<EmergencyType>('mechanical_breakdown');
  const [detailsText, setDetailsText] = useState('');
  const [locationRefText, setLocationRefText] = useState('');
  const [radiusKm, setRadiusKm] = useState(15);
  const [isTriggering, setIsTriggering] = useState(false);
  const [activeChannelAlertId, setActiveChannelAlertId] = useState<string | null>(
    sosAlerts.find((a) => a.status === 'in_progress' || a.status === 'active')?.id || null
  );
  const [chatInput, setChatInput] = useState('');

  const quickPhrases = [
    'Estou a caminho!',
    'Levo kit macarrão e bombinha CO2',
    'Tenho ferramentas e alicate',
    'Chego em cerca de 10 minutos',
    'Estou levando galão com gasolina',
    'Já estou no acostamento com pisca ligado',
  ];

  const emergencyTypes: { type: EmergencyType; label: string; icon: string; desc: string }[] = [
    {
      type: 'mechanical_breakdown',
      label: 'Pane Mecânica',
      icon: '⚙️',
      desc: 'Cabo rompido, corrente, vazamento ou motor apagou',
    },
    {
      type: 'flat_tire',
      label: 'Pneu Furado',
      icon: '🛞',
      desc: 'Sem câmara ou rasgo, precisa de kit macarrão/inflador',
    },
    {
      type: 'out_of_fuel',
      label: 'Sem Combustível',
      icon: '⛽',
      desc: 'Pane seca, precisa de mangueira ou galão de gasolina',
    },
    {
      type: 'electrical_battery',
      label: 'Elétrica / Bateria',
      icon: '⚡',
      desc: 'Sem carga na partida, precisa de cabo de chupeta',
    },
    {
      type: 'accident_fall',
      label: 'Queda / Acidente',
      icon: '🚨',
      desc: 'Sinalização urgente de pista ou socorro médico',
    },
  ];

  const handleStartTriggerSOS = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = locationRefText.trim() || 'Coordenadas GPS automáticas via celular';
    const det = detailsText.trim() || 'Preciso de apoio mecânico de algum motociclista próximo.';

    onTriggerSOS(selectedEmergencyType, det, ref, radiusKm);
    setIsTriggering(false);
    setDetailsText('');
    setLocationRefText('');
  };

  const activeChannelAlert = sosAlerts.find((a) => a.id === activeChannelAlertId);

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-4xl mx-auto px-3 sm:px-4 py-3">
      {/* High Visibility Emergency Trigger Banner */}
      <div className="rounded-2xl bg-gradient-to-b from-red-500/10 via-surface to-surface border border-red-800/50 p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink tracking-tight flex items-center gap-2">
                Rede Comunitária de Socorro SOS
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Alerta instantâneo geolocalizado emitido para motociclistas num raio de até 25 km.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTriggering(!isTriggering)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-950 transition border border-red-400/40"
          >
            <ShieldAlert className="w-5 h-5" />
            {isTriggering ? 'Fechar Painel de Disparo' : 'Pedir Ajuda / Disparar SOS'}
          </button>
        </div>

        {/* Emergency Dispatch Form */}
        {isTriggering && (
          <form onSubmit={handleStartTriggerSOS} className="mt-4 pt-4 border-t border-red-900/50 space-y-4 animate-in fade-in">
            <div>
              <label className="block text-xs font-bold text-red-300 uppercase tracking-wider mb-2 font-mono">
                1. Selecione o Tipo de Emergência
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {emergencyTypes.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSelectedEmergencyType(item.type)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      selectedEmergencyType === item.type
                        ? 'bg-red-600/25 border-red-500 text-ink shadow-md'
                        : 'bg-surface/80 border-line text-ink-muted hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-xs font-bold">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-ink-muted line-clamp-2">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Radius and Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1 font-mono">
                  2. Raio Geográfico de Notificação: <span className="text-brand-soft font-bold">{radiusKm} km</span>
                </label>
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 25].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadiusKm(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                        radiusKm === r
                          ? 'bg-brand text-on-brand'
                          : 'bg-surface text-ink-muted border border-line'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1 font-mono">
                  Sua Posição GPS Atual
                </label>
                <div className="bg-surface/90 border border-line rounded-lg p-2 flex items-center justify-between text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <Compass className="w-4 h-4" />
                    GPS Ativo:
                  </span>
                  <span className="font-mono text-ink">
                    {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Location Reference & Details */}
            <div className="space-y-2">
              <input
                type="text"
                value={locationRefText}
                onChange={(e) => setLocationRefText(e.target.value)}
                placeholder="Ponto de Referência (Ex: Rodovia Imigrantes KM 28, sentido Litoral no acostamento)"
                className="w-full bg-surface border border-line-strong rounded-xl p-3 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-red-500"
              />
              <textarea
                value={detailsText}
                onChange={(e) => setDetailsText(e.target.value)}
                placeholder="Detalhes adicionais (Ex: Cabo de embreagem partiu no manete, estou com ferramentas básicas)"
                className="w-full bg-surface border border-line-strong rounded-xl p-3 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-red-500 h-20 resize-none"
              />
            </div>

            {/* Submit SOS Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-red-950 transition flex items-center justify-center gap-2"
            >
              <Flame className="w-5 h-5" />
              Confirmar e Transmitir Alerta na Região
            </button>
          </form>
        )}
      </div>

      {/* Temporary Rescue Channel (Dedicated Live Assistance) */}
      {activeChannelAlert && (
        <div className="rounded-2xl bg-surface/90 border border-brand/40 p-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-sm font-extrabold text-ink">
                  Canal Temporário de Ajuda: {activeChannelAlert.petitionerName}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-600/20 text-red-300 font-bold">
                  {activeChannelAlert.type === 'mechanical_breakdown'
                    ? 'Pane Mecânica'
                    : activeChannelAlert.type === 'flat_tire'
                    ? 'Pneu Furado'
                    : 'Emergência'}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                {activeChannelAlert.locationReference} • Veículo: {activeChannelAlert.motorcycleInfo}
              </p>
            </div>

            {/* Action buttons: Waze, Maps, and Status */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={getWazeNavigationUrl(activeChannelAlert.lat, activeChannelAlert.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1"
              >
                <span>Waze até o Local</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={getGoogleMapsNavigationUrl(activeChannelAlert.lat, activeChannelAlert.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {activeChannelAlert.status !== 'resolved' && (
                <button
                  onClick={() => onResolveSOS(activeChannelAlert.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolvido
                </button>
              )}
            </div>
          </div>

          {/* Volunteers status */}
          <div className="py-2.5 flex items-center justify-between text-xs text-ink-muted border-b border-line/80">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-brand" />
              Voluntários no Resgate: <strong className="text-ink">{activeChannelAlert.volunteers.length} motociclista(s)</strong>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">Canal criptografado temporário</span>
          </div>

          {/* Chat Messages */}
          <div className="my-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {activeChannelAlert.chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-xl text-xs ${
                  msg.senderId === 'system'
                    ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-center'
                    : msg.senderName.includes('Você') || msg.senderId.includes('user')
                    ? 'bg-elevated/90 text-ink ml-6 border border-line-strong'
                    : 'bg-canvas text-ink mr-6 border border-line'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-ink-muted mb-0.5">
                  <span className="font-bold text-brand-soft">{msg.senderName}</span>
                  <span className="font-mono">{msg.timestamp}</span>
                </div>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Quick Motorcycle Rescue Phrases */}
          <div className="mb-2">
            <p className="text-[10px] text-ink-muted font-mono uppercase mb-1">Respostas Rápidas em Trânsito:</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {quickPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(activeChannelAlert.id, phrase)}
                  className="px-2.5 py-1 rounded-full bg-elevated hover:bg-line-strong text-ink-muted text-[11px] whitespace-nowrap border border-line-strong active:scale-95 transition"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) {
                onSendMessage(activeChannelAlert.id, chatInput.trim());
                setChatInput('');
              }
            }}
            className="flex items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Digite uma mensagem para alinhar o resgate..."
              className="flex-1 bg-canvas border border-line-strong rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-brand hover:opacity-90 text-on-brand font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* Community Alerts Radar List */}
      <div className="rounded-2xl bg-surface/80 border border-line p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Alertas Ativos na Região ({sosAlerts.length})
            </h3>
          </div>
          <span className="text-[11px] text-ink-muted font-mono">Raio máximo: 25 km</span>
        </div>

        <div className="space-y-2.5">
          {sosAlerts.map((alert) => {
            const distance = calculateDistanceKm(userCoords.lat, userCoords.lng, alert.lat, alert.lng);
            const isResolved = alert.status === 'resolved';

            return (
              <div
                key={alert.id}
                className={`rounded-xl p-3.5 border transition ${
                  alert.id === activeChannelAlertId
                    ? 'bg-canvas border-brand/60 shadow-md'
                    : isResolved
                    ? 'bg-canvas/40 border-line/60 opacity-70'
                    : 'bg-canvas/80 border-line hover:border-line-strong'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">{alert.petitionerName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono bg-red-600/20 text-red-300">
                        {alert.type === 'mechanical_breakdown'
                          ? 'Pane Mecânica'
                          : alert.type === 'flat_tire'
                          ? 'Pneu Furado'
                          : alert.type === 'out_of_fuel'
                          ? 'Sem Combustível'
                          : alert.type === 'electrical_battery'
                          ? 'Bateria / Elétrica'
                          : 'Queda / Acidente'}
                      </span>
                      <span className="text-[11px] text-brand-soft font-mono font-bold">
                        ~{formatDistance(distance)} de você
                      </span>
                    </div>

                    <p className="text-xs text-ink-muted mt-1">{alert.details}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-400" />
                      {alert.locationReference} ({alert.motorcycleInfo})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0">
                    <button
                      onClick={() => {
                        setActiveChannelAlertId(alert.id);
                        onRespondToSOS(alert.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-brand hover:opacity-90 text-on-brand font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {alert.id === activeChannelAlertId ? 'Canal Aberto' : 'Prestar Socorro'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
