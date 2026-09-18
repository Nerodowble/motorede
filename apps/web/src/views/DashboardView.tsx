import React, { useState, useEffect } from 'react';
import {
  Gauge,
  ShieldAlert,
  Radio,
  Navigation as NavIcon,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Plus,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Volume2,
  Settings2,
  Fuel,
  Bike,
} from 'lucide-react';
import { Motorcycle, ConsumableStatus, SOSAlert, VoiceRoom } from '@motorede/shared';
import { GeoPoint, getGoogleMapsNavigationUrl, getWazeNavigationUrl } from '../services/geolocation';
import { ActiveTab } from '../components/Navigation';

interface DashboardViewProps {
  motorcycle: Motorcycle;
  consumables: ConsumableStatus[];
  sosAlerts: SOSAlert[];
  voiceRoom: VoiceRoom;
  userCoords: GeoPoint;
  isBackgroundAudioActive: boolean;
  onNavigateTab: (tab: ActiveTab) => void;
  onUpdateKm: (newKm: number) => void;
  onOpenLockscreenModal: () => void;
  onOpenEditMotorcycle?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  motorcycle,
  consumables,
  sosAlerts,
  voiceRoom,
  userCoords,
  isBackgroundAudioActive,
  onNavigateTab,
  onUpdateKm,
  onOpenLockscreenModal,
  onOpenEditMotorcycle,
}) => {
  const [isEditingKm, setIsEditingKm] = useState(false);
  const [kmInput, setKmInput] = useState(motorcycle.currentKm.toString());

  useEffect(() => {
    setKmInput(motorcycle.currentKm.toString());
  }, [motorcycle.currentKm]);

  const activeAlerts = sosAlerts.filter((a) => a.status === 'active' || a.status === 'in_progress');
  const criticalConsumables = consumables.filter((c) => c.status === 'critical' || c.status === 'warning');

  const handleSaveKm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(kmInput, 10);
    if (!isNaN(val) && val > 0) {
      onUpdateKm(val);
      setIsEditingKm(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-4xl mx-auto px-3 sm:px-4 py-3">
      {/* Top Motorcycle Card */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg shrink-0">
              🏍️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
                  {motorcycle.brand} {motorcycle.model}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold shrink-0">
                  {motorcycle.licensePlate}
                </span>
                {motorcycle.displacementCc && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    {motorcycle.displacementCc} cc
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>Ano {motorcycle.year}</span>
                <span>•</span>
                <span>Média: {motorcycle.avgKmPerMonth.toLocaleString('pt-BR')} km/mês</span>
                {motorcycle.avgConsumptionKmL && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400/90 font-mono">
                      {motorcycle.avgConsumptionKmL} km/l
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Odometer quick display & Edit sheet button */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
            <div className="bg-slate-950/60 px-3 py-1.5 sm:py-2 rounded-xl border border-slate-800/80">
              <p className="text-[10px] text-slate-400 font-medium">Odômetro</p>
              <p className="text-base sm:text-lg font-black text-amber-400 font-mono leading-tight">
                {motorcycle.currentKm.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">km</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditingKm(true)}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
                title="Ajustar apenas a quilometragem do odômetro"
              >
                Atualizar KM
              </button>

              {onOpenEditMotorcycle && (
                <button
                  onClick={onOpenEditMotorcycle}
                  className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-bold border border-amber-500/30 transition flex items-center gap-1.5 active:scale-95"
                  title="Cadastrar dados da sua moto, médias e consumo"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Ficha & Dados</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Riding style & autonomy indicators */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Pilotagem:</span>
            <span className="font-semibold text-slate-300">
              {motorcycle.ridingStyle === 'calm'
                ? '🌿 Suave / Econômica'
                : motorcycle.ridingStyle === 'aggressive'
                ? '⚡ Esportiva / Giros Altos'
                : motorcycle.ridingStyle === 'commuter_heavy'
                ? '🚦 Trânsito Intenso Diário'
                : '⚖️ Uso Misto (Padrão)'}
            </span>
          </div>

          {motorcycle.tankCapacityLiters && motorcycle.avgConsumptionKmL && (
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <Fuel className="w-3 h-3 text-amber-400" />
              <span>Tanque {motorcycle.tankCapacityLiters}L</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">
                Autonomia ~{Math.round(motorcycle.tankCapacityLiters * motorcycle.avgConsumptionKmL)} km
              </span>
            </div>
          )}
        </div>

        {/* Modal for updating KM */}
        {isEditingKm && (
          <form onSubmit={handleSaveKm} className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="number"
              value={kmInput}
              onChange={(e) => setKmInput(e.target.value)}
              className="bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-1.5 text-sm text-white font-mono w-40 focus:outline-none"
              placeholder="Novo KM"
              min="0"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsEditingKm(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:text-white"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Big Transit Action Buttons (Ergonomic for gloves and roadside use) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Comboio Voz Button */}
        <button
          onClick={() => onNavigateTab('convoy')}
          className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-left transition active:scale-95 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <p className="text-xs font-bold text-white group-hover:text-amber-400 transition">Comboio por Voz</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {voiceRoom.participants.length} pilotos online
          </p>
        </button>

        {/* SOS Emergency Button */}
        <button
          onClick={() => onNavigateTab('sos')}
          className="p-3.5 rounded-xl bg-red-950/40 hover:bg-red-950/60 border border-red-800/40 text-left transition active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            {activeAlerts.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-600 text-white font-bold">
                {activeAlerts.length} ALERTA
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-red-200 group-hover:text-red-100 transition">Rede SOS</p>
          <p className="text-[11px] text-red-300/70 truncate mt-0.5">
            Socorro geolocalizado
          </p>
        </button>

        {/* Waze External Navigation Button */}
        <a
          href={getWazeNavigationUrl(voiceRoom.destinationLat || -23.9856, voiceRoom.destinationLng || -46.7412)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-left transition active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <NavIcon className="w-4 h-4" />
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition" />
          </div>
          <p className="text-xs font-bold text-white group-hover:text-sky-400 transition">Abrir Waze</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">Destino do comboio</p>
        </a>

        {/* Google Maps External Navigation Button */}
        <a
          href={getGoogleMapsNavigationUrl(voiceRoom.destinationLat || -23.9856, voiceRoom.destinationLng || -46.7412)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-left transition active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MapPin className="w-4 h-4" />
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
          </div>
          <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Google Maps</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">Traçar rota externa</p>
        </a>
      </div>

      {/* Active SOS Alerts Radar (High Priority Warning Banner) */}
      {activeAlerts.length > 0 && (
        <div className="rounded-2xl bg-red-950/30 border border-red-800/40 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 font-mono">
                Alerta SOS no seu Raio Geográfico
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('sos')}
              className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
            >
              Ver Central SOS <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => onNavigateTab('sos')}
                className="bg-slate-950/80 border border-red-900/40 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-red-600/60 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{alert.petitionerName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 text-red-300 font-medium">
                      {alert.type === 'mechanical_breakdown'
                        ? 'Pane Mecânica'
                        : alert.type === 'flat_tire'
                        ? 'Pneu Furado'
                        : alert.type === 'out_of_fuel'
                        ? 'Sem Combustível'
                        : 'Emergência'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400" />
                    {alert.locationReference}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-red-400">Prestar Apoio</span>
                  <p className="text-[10px] text-slate-500">Raio de {alert.radiusKm} km</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Wear Alerts Summary */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Saúde Preditiva dos Consumíveis
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('maintenance')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            Ver Detalhes e Cupons <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Consumable Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {consumables.slice(0, 4).map((item) => {
            const isCritical = item.status === 'critical';
            const isWarning = item.status === 'warning';

            return (
              <div
                key={item.id}
                className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isCritical
                        ? 'bg-red-500/20 text-red-400'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {item.currentWearPercentage}% desgaste
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${item.currentWearPercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Resta: ~{item.estimatedRemainingKm.toLocaleString('pt-BR')} km</span>
                  <span>{item.estimatedRemainingDays > 0 ? `~${item.estimatedRemainingDays} dias` : 'Troca imediata'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PWA & Background Features Highlight Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Execução em Segundo Plano & Tela Bloqueada</p>
            <p className="text-[11px] text-slate-400">
              O áudio do comboio e a captura GPS continuam operando com o smartphone bloqueado no suporte da moto.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenLockscreenModal}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 shrink-0 transition active:scale-95"
        >
          Testar Tela Bloqueada
        </button>
      </div>
    </div>
  );
};
