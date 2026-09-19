import React, { useEffect, useState } from 'react';
import { Search, Star, Users, X, RefreshCw, LogIn } from 'lucide-react';
import { CONVOY_CAPACITY, formatPhone, normalizePhone } from '@motorede/shared';
import { useConvoyBrowser } from '../hooks/useConvoyBrowser';
import { storageService } from '../services/storage';

/**
 * Lista os comboios ativos e encontra um piloto pelo telefone.
 *
 * Pensado para o cenário de evento: dezenas de comboios rodando ao mesmo tempo,
 * e alguém que precisa achar um amigo ou circular entre os grupos.
 */

interface ConvoyBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoomCode: string;
  onJoinConvoy: (code: string) => void;
  idToken: string | null;
}

export const ConvoyBrowser: React.FC<ConvoyBrowserProps> = ({
  isOpen,
  onClose,
  activeRoomCode,
  onJoinConvoy,
  idToken,
}) => {
  const browser = useConvoyBrowser();
  const [phoneQuery, setPhoneQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() =>
    storageService.getFavoriteRooms()
  );

  useEffect(() => {
    if (isOpen) void browser.refresh({ idToken });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizePhone(phoneQuery);
    if (!phone) return;
    void browser.refresh({ phone, idToken });
  };

  const handleToggleFavorite = (code: string) => {
    setFavorites(storageService.toggleFavoriteRoom(code));
  };

  // Favoritos primeiro: é como o admin volta ao comboio dele.
  const ordenados = [...browser.convoys].sort((a, b) => {
    const fa = favorites.includes(a.code) ? 0 : 1;
    const fb = favorites.includes(b.code) ? 0 : 1;
    return fa - fb;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-surface border-t sm:border border-line sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h3 className="text-sm font-extrabold text-ink">Comboios ativos</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void browser.refresh({ idToken })}
              disabled={browser.isLoading}
              className="p-2 rounded-lg hover:bg-elevated text-ink-muted transition disabled:opacity-40"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${browser.isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-elevated text-ink-muted transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Busca por telefone */}
        <form onSubmit={handleSearch} className="p-4 border-b border-line space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              placeholder="Achar piloto pelo telefone"
              inputMode="tel"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-canvas border border-line-strong text-ink text-sm placeholder:text-ink-faint focus:outline-none focus:border-brand/60"
            />
            <button
              type="submit"
              disabled={!normalizePhone(phoneQuery) || browser.isLoading}
              className="px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong disabled:opacity-40 text-ink border border-line-strong transition active:scale-95"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {browser.searched && !browser.found && (
            <p className="text-[11px] text-ink-muted">
              Ninguém com esse telefone está em comboio agora. Ele aparece aqui quando
              entrar.
            </p>
          )}

          {browser.found && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-300">
                  Está no comboio {browser.found.code}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {browser.found.riders} de {CONVOY_CAPACITY} pilotos
                </p>
              </div>
              <button
                onClick={() => onJoinConvoy(browser.found!.code)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 shrink-0"
              >
                Entrar
              </button>
            </div>
          )}
        </form>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {browser.error && <p className="text-xs text-red-400">{browser.error}</p>}

          {!browser.isLoading && ordenados.length === 0 && !browser.error && (
            <p className="text-xs text-ink-muted text-center py-6">
              Nenhum comboio ativo no momento.
            </p>
          )}

          {ordenados.map((c) => {
            const isCurrent = c.code === activeRoomCode;
            const isFavorite = favorites.includes(c.code);

            return (
              <div
                key={c.code}
                className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                  isCurrent
                    ? 'bg-brand/10 border-brand/40'
                    : 'bg-canvas/60 border-line'
                }`}
              >
                <button
                  onClick={() => handleToggleFavorite(c.code)}
                  className="p-1 shrink-0"
                  title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFavorite ? 'text-brand-soft fill-current' : 'text-ink-faint'
                    }`}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink font-mono tracking-wider">
                    {c.code}
                  </p>
                  <p className="text-[11px] text-ink-muted flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {c.riders} de {CONVOY_CAPACITY}
                    {c.total > c.riders && ` · ${c.total - c.riders} de apoio`}
                    {c.isFull && <span className="text-brand-soft font-bold">· lotado</span>}
                  </p>
                </div>

                {isCurrent ? (
                  <span className="text-[11px] text-brand-soft font-bold shrink-0 px-2">
                    você está aqui
                  </span>
                ) : (
                  <button
                    onClick={() => onJoinConvoy(c.code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated hover:bg-line-strong text-ink text-xs font-bold border border-line-strong transition active:scale-95 shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Entrar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="px-4 py-3 border-t border-line text-[10px] text-ink-faint leading-relaxed">
          Comboios comportam {CONVOY_CAPACITY} pilotos. Organizadores têm vagas de apoio
          para circular entre grupos cheios.
        </p>
      </div>
    </div>
  );
};
