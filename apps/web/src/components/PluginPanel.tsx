import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Pause, Play, Plug, Shuffle, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import type { PluginAudio } from '../hooks/usePluginAudio';

/**
 * Plugin de áudio do comboio na web — mesmo desenho do card do app, adaptado.
 *
 * Sem plugin no comboio, é só uma linha discreta para conectar com o código
 * que o painel do plugin mostra. Conectado, um card com pausar, pular e
 * silenciar só para mim; a lista de listas abre por baixo, sem sair da tela.
 */

interface PluginPanelProps {
  pluginAudio: PluginAudio;
  souLider: boolean;
}

const ACOES: Record<string, string> = {
  tocar: 'trocou a lista',
  pausar: 'pausou',
  continuar: 'continuou',
  pular: 'pulou para o próximo',
  parar: 'parou',
  embaralhar: 'mexeu no embaralhar',
};

const botao =
  'flex items-center justify-center gap-2 rounded-xl bg-elevated hover:bg-line-strong border border-line-strong text-ink text-sm font-bold transition active:scale-95 disabled:opacity-50';

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const PluginPanel: React.FC<PluginPanelProps> = ({ pluginAudio, souLider }) => {
  const [agora, setAgora] = useState(Date.now());
  const [aberto, setAberto] = useState(false);
  const [pularTravado, setPularTravado] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 2_000);
    return () => clearInterval(t);
  }, []);

  if (pluginAudio.fase === 'indisponivel' || !pluginAudio.plugin) return <Conectar pluginAudio={pluginAudio} />;

  const nome = pluginAudio.plugin.nome;
  const e = pluginAudio.estado;
  const tocando = e?.estado === 'tocando';
  const parado = !e || e.estado === 'parado';
  const podeDispensar = souLider || e?.chamadoPor === pluginAudio.identidadeLocal;
  const u = e?.ultimo;
  const ultima = u && agora - u.em < 8_000 ? `${u.por} ${ACOES[u.acao] ?? u.acao}` : null;

  const pular = () => {
    if (pularTravado) return;
    setPularTravado(true);
    setTimeout(() => setPularTravado(false), 2_000);
    void pluginAudio.enviar({ tipo: 'pular' });
  };

  return (
    <div className="rounded-2xl bg-surface border border-line p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
          <Plug className="w-4 h-4" />
          {pluginAudio.fase === 'na-sala' ? pluginAudio.plugin.nome : 'Plugin'}
          {pluginAudio.fase === 'na-sala' && !parado ? ` · ${tocando ? 'tocando' : 'pausado'}` : ''}
        </span>
        {pluginAudio.fase === 'na-sala' && (
          <button onClick={() => setAberto(!aberto)} className="text-xs font-bold text-ink-muted hover:text-ink">
            {aberto ? 'Fechar' : 'Listas ›'}
          </button>
        )}
      </div>

      {pluginAudio.plugins.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {pluginAudio.plugins.map((p) => (
            <button
              key={p.id}
              onClick={() => pluginAudio.selecionar(p.id)}
              className={`px-3 py-1.5 rounded-full border text-xs font-bold transition ${
                p.id === pluginAudio.plugin?.id
                  ? 'border-ink text-ink bg-elevated'
                  : 'border-line text-ink-muted hover:text-ink'
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}

      {pluginAudio.fase === 'fora' && (
        <>
          <p className="text-sm font-bold text-ink">{nome}</p>
          {!pluginAudio.plugin.online && (
            <p className="text-xs text-ink-muted">O computador parece desligado agora.</p>
          )}
          {pluginAudio.aviso && <p className="text-xs text-ink-muted">{pluginAudio.aviso}</p>}
          <button onClick={() => void pluginAudio.chamar()} className={`${botao} w-full py-3.5`}>
            Chamar plugin
          </button>
        </>
      )}

      {pluginAudio.fase === 'chamando' && (
        <>
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <Loader2 className="w-4 h-4 animate-spin" /> Chamando… {nome}
          </p>
          <p className="text-xs text-ink-muted">Costuma responder em até 10 s.</p>
          <button onClick={pluginAudio.cancelar} className={`${botao} px-4 py-2.5`}>Cancelar</button>
        </>
      )}

      {pluginAudio.fase === 'sem-resposta' && (
        <>
          <p className="text-sm font-bold text-ink">{nome} não respondeu.</p>
          <p className="text-xs text-ink-muted">O computador precisa estar ligado com o plugin aberto.</p>
          <button onClick={() => void pluginAudio.chamar()} className={`${botao} w-full py-3.5`}>
            Tentar de novo
          </button>
        </>
      )}

      {pluginAudio.fase === 'na-sala' && (
        <>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink truncate">{parado ? 'Nada tocando' : e?.item ?? '—'}</p>
            <p className="text-xs text-ink-muted truncate">
              {(pluginAudio.naoConfirmou && 'O computador não confirmou.') ||
                ultima ||
                (pluginAudio.silenciadoPorMim && 'Silenciado só para você') ||
                e?.lista ||
                'Escolha uma lista'}
            </p>
          </div>

          {parado ? (
            <button onClick={() => setAberto(true)} className={`${botao} w-full py-3.5`}>
              Escolher lista
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => void pluginAudio.enviar({ tipo: tocando ? 'pausar' : 'continuar' })}
                disabled={pluginAudio.pendente}
                className={`${botao} py-4`}
              >
                {pluginAudio.pendente ? '…' : tocando ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Continuar</>}
              </button>
              <button onClick={pular} disabled={pularTravado} className={`${botao} py-4`}>
                <SkipForward className="w-4 h-4" /> Pular
              </button>
            </div>
          )}

          {/* Volume do plugin neste aparelho, como o de um participante. */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => pluginAudio.setSilenciadoPorMim(!pluginAudio.silenciadoPorMim)}
              className={`${botao} p-2.5 ${pluginAudio.silenciadoPorMim ? 'ring-1 ring-ink-muted' : ''}`}
              title={pluginAudio.silenciadoPorMim ? 'Ouvir o plugin de novo' : 'Silenciar só para mim'}
            >
              {pluginAudio.silenciadoPorMim ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={pluginAudio.silenciadoPorMim ? 0 : pluginAudio.volume}
              onChange={(ev) => {
                pluginAudio.setSilenciadoPorMim(false);
                pluginAudio.setVolume(Number(ev.target.value));
              }}
              aria-label="Volume do plugin"
              className="flex-1 accent-brand h-2 bg-elevated rounded-lg cursor-pointer"
            />
            <span className="w-10 text-right text-xs font-mono font-bold text-ink-muted">
              {pluginAudio.silenciadoPorMim ? 'mudo' : `${pluginAudio.volume}%`}
            </span>
          </div>

          {aberto && <Biblioteca pluginAudio={pluginAudio} podeDispensar={podeDispensar} aoFechar={() => setAberto(false)} />}
        </>
      )}

      <Rodape pluginAudio={pluginAudio} />
    </div>
  );
};

/**
 * Sempre visível com um plugin pareado — dentro ou fora da sala, computador
 * ligado ou não: conectar outro, ou desvincular este. Qualquer um do comboio
 * pode, do mesmo jeito que qualquer um pode conectar.
 */
const Rodape: React.FC<{ pluginAudio: PluginAudio }> = ({ pluginAudio }) => {
  const [conectando, setConectando] = useState(false);
  const nome = pluginAudio.plugin?.nome ?? 'o plugin';

  if (conectando) {
    return <Conectar pluginAudio={pluginAudio} abertoInicial aoFechar={() => setConectando(false)} embutido />;
  }

  return (
    <div className="flex items-center justify-between pt-3 border-t border-line/80">
      <button onClick={() => setConectando(true)} className="text-xs font-bold text-ink-muted hover:text-ink py-1">
        + Conectar outro plugin
      </button>
      <button
        onClick={() => {
          if (!confirm(`Desvincular ${nome} deste comboio? Ele some para todo mundo aqui. Para voltar, alguém digita o código de novo.`)) return;
          void pluginAudio.desparear();
        }}
        className="text-xs font-bold text-red-400 hover:text-red-300 py-1"
      >
        Desvincular
      </button>
    </div>
  );
};

/** Listas, filtro, embaralhar e dispensar — para mexer com calma. */
const Biblioteca: React.FC<{ pluginAudio: PluginAudio; podeDispensar: boolean; aoFechar: () => void }> = ({
  pluginAudio,
  podeDispensar,
  aoFechar,
}) => {
  const [busca, setBusca] = useState('');
  const e = pluginAudio.estado;
  const nome = pluginAudio.plugin?.nome ?? 'plugin';
  const termo = semAcento(busca.trim());

  const listas = useMemo(
    () => (e?.listas ?? []).filter((p) => !termo || semAcento(p.nome).includes(termo)),
    [e?.listas, termo]
  );
  const itens = useMemo(
    () =>
      (e?.itens ?? [])
        .map((titulo, indice) => ({ titulo, indice }))
        .filter((f) => !termo || semAcento(f.titulo).includes(termo)),
    [e?.itens, termo]
  );

  const linha = 'w-full text-left px-3 py-3 rounded-lg hover:bg-elevated transition flex justify-between gap-3';

  return (
    <div className="pt-3 border-t border-line/80 space-y-3">
      <input
        value={busca}
        onChange={(ev) => setBusca(ev.target.value)}
        placeholder={`Buscar em ${nome}`}
        className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand"
      />

      {(e?.listas.length ?? 0) === 0 ? (
        <p className="text-xs text-ink-muted">
          {nome} ainda não publicou nenhuma lista.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted mb-1">Listas</p>
            {listas.map((p) => (
              <button key={p.nome} onClick={() => void pluginAudio.enviar({ tipo: 'tocar', lista: p.nome })} className={linha}>
                <span className={`truncate text-sm ${p.nome === e?.lista ? 'font-extrabold text-brand-soft' : 'font-semibold text-ink'}`}>
                  {p.nome}
                </span>
                <span className="text-xs text-ink-muted shrink-0">{p.itens} itens</span>
              </button>
            ))}
          </div>

          {e?.lista && itens.length > 0 && (
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted mb-1">Nesta lista</p>
              {itens.map((f) => (
                <button
                  key={f.indice}
                  onClick={() => void pluginAudio.enviar({ tipo: 'tocar', lista: e.lista!, item: f.indice })}
                  className={linha}
                >
                  <span className={`truncate text-sm ${f.indice === e.indice ? 'font-extrabold text-brand-soft' : 'text-ink'}`}>
                    {f.indice === e.indice ? '▶ ' : ''}
                    {f.titulo}
                  </span>
                </button>
              ))}
            </div>
          )}

          {termo && listas.length === 0 && itens.length === 0 && (
            <p className="text-xs text-ink-muted">Nada com “{busca.trim()}” em {nome}.</p>
          )}
        </div>
      )}

      <p className="text-[11px] text-ink-faint">
        O volume do plugin vale só para este aparelho. Silenciar só para mim não afeta os outros.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => void pluginAudio.enviar({ tipo: 'embaralhar', ligado: !e?.embaralhar })} className={`${botao} px-3 py-2`}>
          <Shuffle className="w-4 h-4" /> Embaralhar: {e?.embaralhar ? 'ligado' : 'desligado'}
        </button>
        {podeDispensar && (
          <>
            <button
              onClick={() => {
                if (!confirm('Dispensar o plugin? Ele sai do comboio para todo mundo.')) return;
                void pluginAudio.enviar({ tipo: 'sair' });
                aoFechar();
              }}
              className={`${botao} px-3 py-2 text-red-400`}
            >
              Dispensar plugin
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/** Sem plugin: uma linha discreta que abre o campo do código. */
const Conectar: React.FC<{
  pluginAudio: PluginAudio;
  /** Já começa aberto (quando vem do "Conectar outro"). */
  abertoInicial?: boolean;
  aoFechar?: () => void;
  /** Dentro de outro card: sem moldura própria. */
  embutido?: boolean;
}> = ({ pluginAudio, abertoInicial = false, aoFechar, embutido = false }) => {
  const [aberto, setAbertoInterno] = useState(abertoInicial);
  const setAberto = (v: boolean) => {
    setAbertoInterno(v);
    if (!v) aoFechar?.();
  };
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-ink-muted hover:text-ink transition"
      >
        <Plug className="w-3.5 h-3.5" /> Conectar plugin com código
      </button>
    );
  }

  const conectar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setEnviando(true);
    setErro(null);
    const falha = await pluginAudio.parear(codigo);
    setEnviando(false);
    if (falha) setErro(falha);
    else {
      setAberto(false);
      setCodigo('');
    }
  };

  return (
    <form
      onSubmit={conectar}
      className={embutido ? 'pt-3 border-t border-line/80 space-y-3' : 'rounded-2xl bg-surface border border-line p-4 space-y-3'}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">Conectar plugin</span>
        <button type="button" onClick={() => setAberto(false)} className="text-ink-muted hover:text-ink" title="Fechar">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        Digite o código que aparece no painel do plugin. Vale para todo mundo neste comboio.
      </p>
      <input
        value={codigo}
        onChange={(ev) => {
          setCodigo(ev.target.value.toUpperCase());
          setErro(null);
        }}
        placeholder="ABC-1234"
        maxLength={9}
        autoFocus
        autoComplete="off"
        className="w-full bg-canvas border border-line rounded-xl px-3 py-3 text-center text-lg font-mono font-bold tracking-[0.3em] text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand"
      />
      {erro && <p className="text-xs text-red-400">{erro}</p>}
      <button
        type="submit"
        disabled={enviando || codigo.replace(/[^a-z0-9]/gi, '').length < 7}
        className="w-full py-3 rounded-xl bg-brand hover:opacity-90 text-on-brand text-sm font-bold transition active:scale-95 disabled:opacity-50"
      >
        {enviando ? 'Conectando…' : 'Conectar'}
      </button>
    </form>
  );
};
