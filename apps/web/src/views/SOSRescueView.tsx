import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  Radio,
  Users,
  Compass,
  ExternalLink,
  CheckCircle2,
  Flame,
  BellRing,
  WifiOff,
} from 'lucide-react';
import { EmergencyType, distanceKm, validateRequest } from '@motorede/shared';
import { GeoPoint, getGoogleMapsNavigationUrl, getWazeNavigationUrl } from '../services/geolocation';
import type { useSocorroRede } from '../hooks/useSocorroRede';
import { pedirSocorro, responderChamado } from '../services/socorroRede';

/**
 * Socorro na web, ligado na mesma rede do aplicativo.
 *
 * Quem pede do computador alcança quem está de celular, e o contrário também.
 * Os protocolos de entrega são diferentes — o app recebe pelo serviço do Expo,
 * o navegador pelo push do próprio navegador — mas a rede é uma só, e quem
 * pede não precisa saber a diferença.
 *
 * O QUE ESTA TELA NÃO PROMETE
 *
 * Não diz "alerta enviado". Diz quantos aparelhos havia no raio e quantos
 * receberam, número vindo do servidor. Esta mesma tela já anunciou
 * "Localização GPS transmitida com sucesso" enquanto nada saía do navegador, e
 * o estrago dessa frase num pedido de socorro é de outra ordem: a pessoa para
 * de procurar ajuda porque acredita que já conseguiu.
 *
 * Também não esconde onde não funciona: no iPhone, push na web exige o site
 * instalado na tela de início. Isso está escrito, não silenciado.
 *
 * O QUE SUMIU DAQUI
 *
 * O "canal temporário de ajuda" com bate-papo e as respostas rápidas. Não
 * existia transporte nenhum para aquelas mensagens — elas eram gravadas no
 * próprio aparelho e ninguém do outro lado jamais as leu. Combinar o resgate
 * se faz por telefone, e a tela agora diz isso.
 */

interface SOSRescueViewProps {
  userCoords: GeoPoint | null;
  motorcycleInfo: string;
  nomeDoPiloto: string;
  /** Guarda o pedido no histórico local. Nada disso vive no servidor. */
  onRegistrarPedido: (
    type: EmergencyType,
    details: string,
    reference: string,
    radiusKm: number
  ) => void;
  socorro: ReturnType<typeof useSocorroRede>;
}

const EMERGENCIAS: Array<{ type: EmergencyType; rotulo: string; icone: string; leva: string }> = [
  { type: 'flat_tire', rotulo: 'Pneu furado', icone: '🛞', leva: 'kit macarrão, bomba' },
  { type: 'mechanical_breakdown', rotulo: 'Pane mecânica', icone: '⚙️', leva: 'ferramentas' },
  { type: 'out_of_fuel', rotulo: 'Sem combustível', icone: '⛽', leva: 'galão, mangueira' },
  { type: 'electrical_battery', rotulo: 'Bateria', icone: '⚡', leva: 'cabo de chupeta' },
  { type: 'accident_fall', rotulo: 'Queda / acidente', icone: '🚨', leva: 'avisa todos na hora' },
];

const RAIOS = [5, 10, 15, 25];

export const SOSRescueView: React.FC<SOSRescueViewProps> = ({
  userCoords,
  motorcycleInfo,
  nomeDoPiloto,
  onRegistrarPedido,
  socorro,
}) => {
  const [tipo, setTipo] = useState<'emergencia' | 'apoio'>('emergencia');
  const [emergencia, setEmergencia] = useState<EmergencyType>('flat_tire');
  const [referencia, setReferencia] = useState('');
  const [detalhes, setDetalhes] = useState('');
  const [raioKm, setRaioKm] = useState(15);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const posicao = socorro.posicao ?? userCoords;

  const validacao = useMemo(
    () =>
      validateRequest({
        reference: referencia,
        details: detalhes || 'sem detalhes',
        location: posicao,
        radiusKm: raioKm,
      }),
    [referencia, detalhes, posicao, raioKm]
  );

  const disparar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socorro.rede.inscricao || !posicao) return;

    setEnviando(true);
    setErro(null);
    setResultado(null);

    const r = await pedirSocorro({
      inscricao: socorro.rede.inscricao,
      kind: tipo,
      emergency: tipo === 'emergencia' ? emergencia : undefined,
      nome: nomeDoPiloto,
      moto: motorcycleInfo,
      referencia: referencia.trim(),
      detalhes: detalhes.trim(),
      posicao,
      raioKm,
    });
    setEnviando(false);

    if ('erro' in r) {
      setErro(r.erro);
      return;
    }

    // Número, não adjetivo: "enviado" não diz se havia alguém para receber.
    setResultado(
      r.encontrados === 0
        ? 'Ninguém da rede está no seu raio agora. Nada foi entregue.'
        : `${r.avisados} de ${r.encontrados} aparelho(s) no raio receberam. A resposta aparece aqui.`
    );
    socorro.registrarMeuPedido({
      pedidoId: r.pedidoId,
      kind: tipo,
      referencia: referencia.trim(),
      em: new Date().toISOString(),
      encontrados: r.encontrados,
      avisados: r.avisados,
    });
    onRegistrarPedido(emergencia, detalhes.trim(), referencia.trim(), raioKm);
    setReferencia('');
    setDetalhes('');
  };

  const atender = async (pedidoId: string) => {
    const r = await responderChamado({
      pedidoId,
      nome: nomeDoPiloto,
      moto: motorcycleInfo,
      resposta: 'Posso ajudar, estou indo.',
      posicao,
    });
    if (r.ok) socorro.marcarRespondido(pedidoId);
    else setErro(r.erro || 'Não consegui avisar quem pediu.');
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24 max-w-4xl mx-auto px-3 sm:px-4 py-3">
      {!socorro.rede.disponivel && (
        <div className="rounded-2xl bg-surface border border-line p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-brand/15 text-brand-soft shrink-0">
              <BellRing className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black text-ink">Rede de socorro</h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Pilotos por perto recebem um aviso quando você pede ajuda — e você recebe
                quando alguém precisa perto de você. Para funcionar nos dois sentidos, o
                site avisa onde você está de forma aproximada: um quadrado de cerca de
                1 km, nunca o ponto exato.
              </p>
            </div>
          </div>

          {!!socorro.rede.motivo && (
            <p className="text-[11px] text-red-400 mt-3 leading-relaxed">{socorro.rede.motivo}</p>
          )}

          <button
            onClick={() => void socorro.entrar()}
            disabled={socorro.entrando || !socorro.suportado}
            className="mt-4 w-full sm:w-auto px-5 py-3 rounded-xl bg-brand hover:opacity-90 disabled:opacity-40 text-on-brand font-bold text-xs uppercase tracking-wider transition active:scale-95"
          >
            {socorro.entrando ? 'Entrando…' : 'Entrar na rede'}
          </button>

          {!socorro.suportado && (
            <p className="text-[11px] text-ink-faint mt-3 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              Este navegador não recebe notificações. O aplicativo recebe.
            </p>
          )}

          <p className="text-[10px] text-ink-faint mt-3 leading-relaxed">
            Em emergência com risco de vida, ligue 190 ou 192 primeiro. Isto é ajuda de
            outros motociclistas e não substitui socorro oficial.
          </p>
        </div>
      )}

      {socorro.meusPedidos.length > 0 && (
        <div className="rounded-2xl bg-surface border border-brand/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Seu pedido está de pé ({socorro.meusPedidos.length})
            </h3>
          </div>

          <div className="space-y-2">
            {socorro.meusPedidos.map((p) => (
              <div key={p.pedidoId} className="rounded-xl bg-canvas/80 border border-line p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono bg-brand/20 text-brand-soft">
                    {p.kind === 'emergencia' ? 'Socorro' : 'Apoio'}
                  </span>
                  <span className="text-[11px] text-ink-faint font-mono">
                    {new Date(p.em).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-ink mt-1">{p.referencia}</p>
                <p className="text-[11px] text-ink-muted mt-1">
                  {p.encontrados === 0
                    ? 'Ninguém estava no seu raio quando você pediu.'
                    : `${p.avisados} de ${p.encontrados} aparelho(s) foram avisados.`}
                </p>
                <button
                  onClick={() => void socorro.encerrarMeuPedido(p.pedidoId)}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95"
                >
                  Já resolvi, encerrar
                </button>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-ink-faint mt-2 leading-relaxed">
            Encerre assim que resolver. Um pedido esquecido continua na lista de quem
            está por perto por até 2 horas, e manda gente rodar atrás de você depois de
            você já ter ido embora.
          </p>
        </div>
      )}

      {socorro.chamados.length > 0 && (
        <div className="rounded-2xl bg-surface border border-red-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Pedindo ajuda perto de você ({socorro.chamados.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {socorro.chamados.map((c) => {
              const longe =
                c.celula && posicao ? `~${distanceKm(posicao, c.celula).toFixed(1)} km` : null;
              return (
                <div key={c.pedidoId} className="rounded-xl bg-canvas/80 border border-line p-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-ink">{c.nome}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono bg-red-600/20 text-red-300">
                      {c.kind === 'emergencia' ? 'Socorro' : 'Apoio'}
                    </span>
                    {!!longe && (
                      <span className="text-[11px] text-brand-soft font-mono font-bold">
                        {longe} · região aproximada
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    {c.referencia}
                  </p>
                  {!!c.detalhes && <p className="text-[11px] text-ink-muted mt-1">{c.detalhes}</p>}
                  {!!c.moto && <p className="text-[11px] text-ink-faint mt-0.5">{c.moto}</p>}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {c.respondido ? (
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Você avisou que vai
                      </span>
                    ) : (
                      <button
                        onClick={() => void atender(c.pedidoId)}
                        className="px-3.5 py-2 rounded-xl bg-brand hover:opacity-90 text-on-brand font-bold text-xs transition active:scale-95"
                      >
                        Posso ajudar
                      </button>
                    )}

                    {!!c.celula && (
                      <>
                        <a
                          href={getWazeNavigationUrl(c.celula.lat, c.celula.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1"
                        >
                          Waze <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href={getGoogleMapsNavigationUrl(c.celula.lat, c.celula.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1"
                        >
                          Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}

                    <button
                      onClick={() => socorro.dispensarChamado(c.pedidoId)}
                      className="px-3 py-1.5 rounded-lg text-ink-muted hover:text-ink border border-line text-xs"
                    >
                      Dispensar
                    </button>
                  </div>

                  <p className="text-[10px] text-ink-faint mt-2">
                    A navegação leva até a região, não até a pessoa. O endereço exato só
                    aparece se quem pediu aceitar você.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {socorro.respostas.length > 0 && (
        <div className="rounded-2xl bg-surface border border-brand/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Quem respondeu ao seu pedido ({socorro.respostas.length})
            </h3>
          </div>
          <div className="space-y-2">
            {socorro.respostas.map((r, i) => (
              <div
                key={`${r.pedidoId}-${i}`}
                className="rounded-xl bg-canvas/80 border border-line p-3"
              >
                <p className="text-xs font-bold text-ink">
                  {r.nome}
                  {r.moto ? ` · ${r.moto}` : ''}
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {r.celula && posicao
                    ? `a ~${distanceKm(posicao, r.celula).toFixed(1)} km de você`
                    : 'região não informada'}
                </p>
                <p className="text-[10px] text-ink-faint mt-1.5 leading-relaxed">
                  Combine por telefone antes de passar o endereço exato. O MotoRede não
                  verifica a identidade de ninguém.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {socorro.rede.disponivel && (
        <form
          onSubmit={disparar}
          className="rounded-2xl bg-gradient-to-b from-red-500/10 via-surface to-surface border border-red-800/50 p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-base font-black text-ink">Pedir ajuda</h2>
              <p className="text-[11px] text-ink-muted">Chega no celular de quem está por perto.</p>
            </div>
          </div>

          <div className="flex gap-2">
            {(['emergencia', 'apoio'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  tipo === t ? 'bg-brand text-on-brand' : 'bg-surface text-ink-muted border border-line'
                }`}
              >
                {t === 'emergencia' ? 'Socorro' : 'Apoio'}
              </button>
            ))}
          </div>

          {tipo === 'emergencia' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMERGENCIAS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setEmergencia(item.type)}
                  className={`p-3 rounded-xl border text-left transition ${
                    emergencia === item.type
                      ? 'bg-red-600/25 border-red-500 text-ink'
                      : 'bg-surface/80 border-line text-ink-muted hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icone}</span>
                    <span className="text-xs font-bold">{item.rotulo}</span>
                  </div>
                  <span className="text-[10px] text-ink-muted">{item.leva}</span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-ink-muted mb-1 font-mono">
              Onde você está, com palavras
            </label>
            <input
              type="text"
              required
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Imigrantes km 28, sentido litoral, acostamento"
              className="w-full bg-surface border border-line-strong rounded-xl p-3 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-red-500"
            />
            {/* O GPS erra, cai, é negado. Quem vai socorrer chega pela frase. */}
            {!!validacao.errors.reference && referencia.length > 0 && (
              <p className="text-[11px] text-red-400 mt-1">{validacao.errors.reference}</p>
            )}
          </div>

          <textarea
            value={detalhes}
            onChange={(e) => setDetalhes(e.target.value)}
            placeholder={
              tipo === 'emergencia'
                ? EMERGENCIAS.find((e) => e.type === emergencia)?.leva
                : 'Preciso que alguém pegue um pacote no Itaim'
            }
            className="w-full bg-surface border border-line-strong rounded-xl p-3 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-red-500 h-20 resize-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1 font-mono">
                Quem avisar: <span className="text-brand-soft">{raioKm} km</span>
              </label>
              <div className="flex items-center gap-2">
                {RAIOS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRaioKm(r)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                      raioKm === r
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
                Sua posição
              </label>
              <div className="bg-surface/90 border border-line rounded-lg p-2 flex items-center justify-between text-xs">
                {posicao ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <Compass className="w-4 h-4" />
                      GPS ativo
                    </span>
                    <span className="font-mono text-ink-muted">
                      {posicao.lat.toFixed(3)}, {posicao.lng.toFixed(3)}
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 text-red-400">
                    <Compass className="w-4 h-4 shrink-0" />
                    Sem GPS — escreva bem a referência
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando || !validacao.valid || !posicao}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 active:scale-95 text-white font-extrabold text-sm uppercase tracking-wider transition flex items-center justify-center gap-2"
          >
            <Flame className="w-5 h-5" />
            {enviando ? 'Acionando…' : tipo === 'emergencia' ? 'Pedir socorro agora' : 'Pedir apoio'}
          </button>

          {!!resultado && <p className="text-xs text-emerald-400 leading-relaxed">{resultado}</p>}
          {!!erro && <p className="text-xs text-red-400 leading-relaxed">{erro}</p>}

          <p className="text-[10px] text-ink-faint leading-relaxed">
            Seu endereço exato não vai no aviso — só a região de mais ou menos 1 km, e ele
            só chega a quem você aceitar. Você fica alcançável por 45 minutos depois de
            abrir o site. Em risco de vida, 190 ou 192 primeiro.
          </p>

          <button
            type="button"
            onClick={() => void socorro.sair()}
            className="text-[11px] text-ink-muted hover:text-ink underline"
          >
            Sair da rede
          </button>
        </form>
      )}
    </div>
  );
};
