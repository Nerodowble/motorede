import React, { useState, useEffect } from 'react';
import { Radio, Wrench, ChevronRight, Bike, Gauge, Share2, Check, Repeat } from 'lucide-react';
import { Motorcycle, VoiceRoom, type MaintenanceItemStatus } from '@motorede/shared';
import { ActiveTab } from '../components/Navigation';
import { MotorcycleEmptyState } from '../components/MotorcycleEmptyState';
import { useConvoyBrowser } from '../hooks/useConvoyBrowser';
import { codigoInicialDoComboio, compartilharConvite } from '../services/convoyInvite';

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
 * Ficou o que responde à pergunta de quem abre o app de capacete na mão:
 * qual é o meu comboio, tem alguém nele, e como entro — com UM toque.
 *
 * A moto ficou numa linha só (modelo, km, atualizar km). O botão "Ficha" saiu:
 * a aba Moto já tem a ficha, e dois caminhos para a mesma tela confundem.
 */

interface DashboardViewProps {
  motorcycle: Motorcycle | null;
  maintenance: MaintenanceItemStatus[];
  voiceRoom: VoiceRoom;
  /** Token do Google, para a consulta de quem está no comboio. */
  idToken: string | null;
  onNavigateTab: (tab: ActiveTab) => void;
  /** Abre a aba Comboio já conectando (ver App: entrada automática). */
  onEntrarNoComboio: () => void;
  onUpdateKm: (newKm: number) => void;
  /** Só para o estado sem moto (cadastrar). */
  onOpenEditMotorcycle?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  motorcycle,
  maintenance,
  voiceRoom,
  idToken,
  onNavigateTab,
  onEntrarNoComboio,
  onUpdateKm,
  onOpenEditMotorcycle,
}) => {
  const [isEditingKm, setIsEditingKm] = useState(false);
  const [kmInput, setKmInput] = useState(motorcycle?.currentKm.toString() ?? '');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setKmInput(motorcycle?.currentKm.toString() ?? '');
  }, [motorcycle?.currentKm]);

  // Mesma regra da tela de voz (convite ?sala= antes do último comboio), para
  // o código mostrado aqui ser exatamente o comboio em que o botão conecta.
  const roomCode = codigoInicialDoComboio(voiceRoom.code);

  // Quem está no comboio agora, pela mesma API que lista os comboios ativos.
  // Ela devolve contagem, não nomes — e contagem é o que dá para afirmar sem
  // inventar. Falhou a consulta? O cartão simplesmente não afirma nada.
  const comboios = useConvoyBrowser();
  const [consultou, setConsultou] = useState(false);
  useEffect(() => {
    void comboios.refresh({ idToken }).finally(() => setConsultou(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const noAr = comboios.convoys.find((c) => c.code === roomCode);

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

  const handleConvidar = async () => {
    if ((await compartilharConvite(roomCode)) === 'copiado') {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-2xl mx-auto px-3 sm:px-4 py-4">
      {/* Ação principal: o comboio. É o que o piloto abre o app para fazer. */}
      <section
        aria-label="Seu comboio"
        className="rounded-2xl bg-gradient-to-b from-surface to-canvas border border-line p-5 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-soft shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-muted uppercase tracking-wider font-mono">
              Seu comboio
            </p>
            <p className="text-2xl font-black text-code font-mono tracking-widest leading-tight">
              {roomCode}
            </p>
          </div>
        </div>

        {/* Estado real, vindo do servidor. Substitui o "Pronto/Áudio ativo"
            que ficava no cabeçalho e não dizia se havia alguém do outro lado. */}
        {consultou && !comboios.error && (
          <p className="flex items-center gap-2 text-sm mb-4" aria-live="polite">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                noAr ? 'bg-live animate-pulse' : 'bg-line-strong'
              }`}
            />
            {noAr ? (
              <span className="text-ink">
                <strong className="text-success">Ao vivo</strong>
                {' · '}
                {noAr.total === 1 ? '1 piloto na conversa' : `${noAr.total} pilotos na conversa`}
              </span>
            ) : (
              <span className="text-ink-muted">
                <strong className="text-ink">Fora do ar</strong> · ninguém conectado agora
              </span>
            )}
          </p>
        )}

        <button
          onClick={onEntrarNoComboio}
          className="w-full min-h-14 py-4 rounded-xl bg-action hover:opacity-90 text-on-action font-black text-base uppercase tracking-wide transition active:scale-95 shadow-lg"
        >
          Entrar no comboio
        </button>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={handleConvidar}
            className="min-h-11 flex items-center justify-center gap-2 px-3 rounded-xl bg-elevated hover:bg-line-strong text-ink text-sm font-semibold border border-line-strong transition active:scale-95"
          >
            {copiado ? <Check className="w-4 h-4 text-success" /> : <Share2 className="w-4 h-4" />}
            {copiado ? 'Link copiado' : 'Convidar'}
          </button>
          {/* Trocar leva à aba Comboio, onde já estão a lista de comboios
              ativos, o código e o "Novo" — sem repetir tudo isso aqui. */}
          <button
            onClick={() => onNavigateTab('convoy')}
            className="min-h-11 flex items-center justify-center gap-2 px-3 rounded-xl bg-elevated hover:bg-line-strong text-ink text-sm font-semibold border border-line-strong transition active:scale-95"
          >
            <Repeat className="w-4 h-4" />
            {/* Em 360px "Trocar comboio" quebra em duas linhas; o cartão já
                diz que é do comboio. */}
            <span className="whitespace-nowrap">
              Trocar<span className="hidden min-[400px]:inline"> comboio</span>
            </span>
          </button>
        </div>
      </section>

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
                {motorcycle.brand} {motorcycle.model}
              </p>
              <p className="text-xs text-ink-muted font-mono">
                {motorcycle.currentKm.toLocaleString('pt-BR')} km
              </p>
            </div>

            {!isEditingKm && (
              <button
                onClick={() => setIsEditingKm(true)}
                className="min-h-11 flex items-center gap-1.5 px-3 rounded-xl bg-elevated hover:bg-line-strong text-ink text-xs font-semibold border border-line-strong transition active:scale-95 shrink-0"
              >
                <Gauge className="w-4 h-4 text-brand-soft" />
                Atualizar km
              </button>
            )}
          </div>

          {isEditingKm && (
            <form onSubmit={handleSaveKm} className="mt-3 pt-3 border-t border-line flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                aria-label="Quilometragem atual"
                value={kmInput}
                onChange={(e) => setKmInput(e.target.value)}
                autoFocus
                className="flex-1 min-w-0 min-h-11 px-3 rounded-xl bg-canvas border border-line-strong text-ink text-sm font-mono focus:outline-none focus:border-brand/60"
              />
              <button
                type="submit"
                className="min-h-11 px-4 rounded-xl bg-action hover:opacity-90 text-on-action text-xs font-bold transition active:scale-95"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setIsEditingKm(false)}
                className="min-h-11 px-3 rounded-xl bg-elevated hover:bg-line-strong text-ink-muted text-xs font-semibold border border-line-strong transition"
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
            <Wrench className="w-4 h-4 text-warning" />
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
                  className={`text-xs font-mono font-bold shrink-0 ${
                    m.status === 'vencido' ? 'text-danger' : 'text-warning'
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
