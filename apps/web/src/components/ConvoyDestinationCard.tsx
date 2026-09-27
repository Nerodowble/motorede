import React, { useState } from 'react';
import { Navigation, ExternalLink, MapPin, Plus } from 'lucide-react';
import type { VoiceRoom } from '@motorede/shared';
import {
  getGoogleMapsNavigationUrl,
  getGoogleMapsSearchUrl,
  getWazeNavigationUrl,
  getWazeSearchUrl,
} from '../services/geolocation';

/**
 * Destino do comboio e os atalhos de rota (Waze / Google Maps).
 *
 * Saiu de ConvoyVoiceView, que passava de 800 linhas. Sem destino, mostra o
 * estado vazio e um convite para definir — nunca um lugar de exemplo: o
 * piloto não tem como saber que "Serra do Mar" era enfeite e não escolha do
 * líder, e o botão de rota o levaria para lá.
 */

interface ConvoyDestinationCardProps {
  voiceRoom: VoiceRoom;
  onUpdateVoiceRoom: (updated: Partial<VoiceRoom>) => void;
}

export const ConvoyDestinationCard: React.FC<ConvoyDestinationCardProps> = ({
  voiceRoom,
  onUpdateVoiceRoom,
}) => {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(voiceRoom.destinationName || '');

  const destino = voiceRoom.destinationName?.trim();
  // Coordenada só existe se veio de algum lugar real; sem ela a rota é pelo
  // nome, e o próprio Waze/Maps resolve o endereço.
  const temCoordenada =
    typeof voiceRoom.destinationLat === 'number' && typeof voiceRoom.destinationLng === 'number';
  const urlWaze = destino
    ? temCoordenada
      ? getWazeNavigationUrl(voiceRoom.destinationLat!, voiceRoom.destinationLng!)
      : getWazeSearchUrl(destino)
    : null;
  const urlMaps = destino
    ? temCoordenada
      ? getGoogleMapsNavigationUrl(voiceRoom.destinationLat!, voiceRoom.destinationLng!)
      : getGoogleMapsSearchUrl(destino)
    : null;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    // Só o nome. Antes gravava junto uma coordenada fixa da Serra do Mar, e a
    // rota ia para lá qualquer que fosse o destino digitado.
    onUpdateVoiceRoom({
      destinationName: nome.trim(),
      destinationLat: undefined,
      destinationLng: undefined,
    });
    setEditando(false);
  };

  return (
    <>
      <div className="rounded-2xl bg-surface/80 border border-line p-4 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Navigation className="w-4 h-4 text-info shrink-0" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono truncate">
              Destino do comboio
            </h3>
          </div>
          {destino && (
            <button
              onClick={() => setEditando(true)}
              className="min-h-11 px-2 text-xs text-brand-soft font-semibold shrink-0"
            >
              Alterar
            </button>
          )}
        </div>

        {destino ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas/80 p-3.5 rounded-xl border border-line/80">
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink break-words">{destino}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  Abra a rota; o áudio do comboio continua em segundo plano.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={urlWaze!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial min-h-11 px-3.5 rounded-xl bg-info/20 hover:bg-info/30 text-info border border-info/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Waze</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={urlMaps!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial min-h-11 px-3.5 rounded-xl bg-live/20 hover:bg-live/30 text-success border border-success/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          // Estado vazio: diz a verdade e oferece a ação, sem inventar lugar.
          <button
            onClick={() => setEditando(true)}
            className="w-full min-h-11 flex items-center justify-between gap-3 bg-canvas/80 p-3.5 rounded-xl border border-dashed border-line-strong text-left transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <MapPin className="w-5 h-5 text-ink-faint shrink-0" />
              <span className="text-sm text-ink-muted">Nenhum destino</span>
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-ink shrink-0">
              <Plus className="w-4 h-4" />
              Definir
            </span>
          </button>
        )}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-5 shadow-2xl">
            <h3 className="text-sm font-extrabold text-ink mb-2">Destino do comboio</h3>
            <p className="text-xs text-ink-muted mb-4">
              Informe o ponto final para que todos abram a rota no Waze ou no Google Maps com um toque.
            </p>
            <form onSubmit={salvar} className="space-y-3">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Serra da Graciosa, Morretes - PR"
                className="w-full bg-canvas border border-line-strong rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-brand"
                required
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="min-h-11 px-3 rounded-lg bg-elevated text-ink-muted text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-11 px-4 rounded-lg bg-action text-on-action font-bold text-xs hover:opacity-90"
                >
                  Salvar destino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
