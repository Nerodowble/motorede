import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Music, Pause, Play, Shuffle, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import type { MusicPlugin } from '../hooks/useMusicPlugin';

/**
 * Música do comboio na web — mesmo desenho do card do app, adaptado.
 *
 * Sem plugin no comboio, é só uma linha discreta para conectar com o código
 * que o painel do plugin mostra. Conectado, um card com pausar, pular e
 * silenciar só para mim; a lista de playlists abre por baixo, sem sair da tela.
 */

interface MusicPanelProps {
  music: MusicPlugin;
  souLider: boolean;
}

const ACOES: Record<string, string> = {
  tocar: 'trocou de música',
  pausar: 'pausou',
  continuar: 'continuou',
  pular: 'pulou a faixa',
  parar: 'parou a música',
  embaralhar: 'mexeu no embaralhar',
};

const botao =
  'flex items-center justify-center gap-2 rounded-xl bg-elevated hover:bg-line-strong border border-line-strong text-ink text-sm font-bold transition active:scale-95 disabled:opacity-50';

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const MusicPanel: React.FC<MusicPanelProps> = ({ music, souLider }) => {
  const [agora, setAgora] = useState(Date.now());
  const [aberto, setAberto] = useState(false);
  const [pularTravado, setPularTravado] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 2_000);
    return () => clearInterval(t);
  }, []);

  if (music.fase === 'indisponivel' || !music.plugin) return <Conectar music={music} />;

  const nome = music.plugin.nome;
  const e = music.estado;
  const tocando = e?.estado === 'tocando';
  const parado = !e || e.estado === 'parado';
  const podeDispensar = souLider || e?.chamadoPor === music.identidadeLocal;
  const u = e?.ultimo;
  const ultima = u && agora - u.em < 8_000 ? `${u.por} ${ACOES[u.acao] ?? u.acao}` : null;

  const pular = () => {
    if (pularTravado) return;
    setPularTravado(true);
    setTimeout(() => setPularTravado(false), 2_000);
    void music.enviar({ tipo: 'pular' });
  };

  return (
    <div className="rounded-2xl bg-surface border border-line p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
          <Music className="w-4 h-4" />
          Música{music.fase === 'na-sala' && !parado ? ` · ${tocando ? 'tocando' : 'pausada'}` : ''}
        </span>
        {music.fase === 'na-sala' && (
          <button onClick={() => setAberto(!aberto)} className="text-xs font-bold text-ink-muted hover:text-ink">
            {aberto ? 'Fechar' : 'Playlists ›'}
          </button>
        )}
      </div>

      {music.fase === 'fora' && (
        <>
          <p className="text-sm font-bold text-ink">{nome}</p>
          {!music.plugin.online && (
            <p className="text-xs text-ink-muted">O computador parece desligado agora.</p>
          )}
          {music.aviso && <p className="text-xs text-ink-muted">{music.aviso}</p>}
          <button onClick={() => void music.chamar()} className={`${botao} w-full py-3.5`}>
            Chamar música
          </button>
        </>
      )}

      {music.fase === 'chamando' && (
        <>
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <Loader2 className="w-4 h-4 animate-spin" /> Chamando… {nome}
          </p>
          <p className="text-xs text-ink-muted">Costuma responder em até 10 s.</p>
          <button onClick={music.cancelar} className={`${botao} px-4 py-2.5`}>Cancelar</button>
        </>
      )}

      {music.fase === 'sem-resposta' && (
        <>
          <p className="text-sm font-bold text-ink">{nome} não respondeu.</p>
          <p className="text-xs text-ink-muted">O computador precisa estar ligado com o plugin aberto.</p>
          <button onClick={() => void music.chamar()} className={`${botao} w-full py-3.5`}>
            Tentar de novo
          </button>
        </>
      )}

      {music.fase === 'na-sala' && (
        <>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink truncate">{parado ? 'Nada tocando' : e?.faixa ?? '—'}</p>
            <p className="text-xs text-ink-muted truncate">
              {(music.naoConfirmou && 'O computador não confirmou.') ||
                ultima ||
                (music.silenciadoPorMim && 'Silenciada só para você') ||
                e?.playlist ||
                'Escolha uma playlist'}
            </p>
          </div>

          {parado ? (
            <button onClick={() => setAberto(true)} className={`${botao} w-full py-3.5`}>
              Escolher playlist
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => void music.enviar({ tipo: tocando ? 'pausar' : 'continuar' })}
                disabled={music.pendente}
                className={`${botao} py-4`}
              >
                {music.pendente ? '…' : tocando ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Continuar</>}
              </button>
              <button onClick={pular} disabled={pularTravado} className={`${botao} py-4`}>
                <SkipForward className="w-4 h-4" /> Pular
              </button>
            </div>
          )}

          <button
            onClick={() => music.setSilenciadoPorMim(!music.silenciadoPorMim)}
            className={`${botao} w-full py-3 ${music.silenciadoPorMim ? 'ring-1 ring-ink-muted' : ''}`}
          >
            {music.silenciadoPorMim ? <><Volume2 className="w-4 h-4" /> Ouvir música de novo</> : <><VolumeX className="w-4 h-4" /> Silenciar só para mim</>}
          </button>

          {aberto && <Biblioteca music={music} podeDispensar={podeDispensar} aoFechar={() => setAberto(false)} />}
        </>
      )}
    </div>
  );
};

/** Playlists, filtro, embaralhar e dispensar — para mexer com calma. */
const Biblioteca: React.FC<{ music: MusicPlugin; podeDispensar: boolean; aoFechar: () => void }> = ({
  music,
  podeDispensar,
  aoFechar,
}) => {
  const [busca, setBusca] = useState('');
  const e = music.estado;
  const nome = music.plugin?.nome ?? 'plugin';
  const termo = semAcento(busca.trim());

  const playlists = useMemo(
    () => (e?.playlists ?? []).filter((p) => !termo || semAcento(p.nome).includes(termo)),
    [e?.playlists, termo]
  );
  const faixas = useMemo(
    () =>
      (e?.faixas ?? [])
        .map((titulo, indice) => ({ titulo, indice }))
        .filter((f) => !termo || semAcento(f.titulo).includes(termo)),
    [e?.faixas, termo]
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

      {(e?.playlists.length ?? 0) === 0 ? (
        <p className="text-xs text-ink-muted">
          Nenhuma playlist em {nome}. As playlists são pastas de áudio montadas no computador.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted mb-1">Playlists</p>
            {playlists.map((p) => (
              <button key={p.nome} onClick={() => void music.enviar({ tipo: 'tocar', playlist: p.nome })} className={linha}>
                <span className={`truncate text-sm ${p.nome === e?.playlist ? 'font-extrabold text-brand-soft' : 'font-semibold text-ink'}`}>
                  {p.nome}
                </span>
                <span className="text-xs text-ink-muted shrink-0">{p.faixas} faixas</span>
              </button>
            ))}
          </div>

          {e?.playlist && faixas.length > 0 && (
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted mb-1">Nesta playlist</p>
              {faixas.map((f) => (
                <button
                  key={f.indice}
                  onClick={() => void music.enviar({ tipo: 'tocar', playlist: e.playlist!, faixa: f.indice })}
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

          {termo && playlists.length === 0 && faixas.length === 0 && (
            <p className="text-xs text-ink-muted">Nada com “{busca.trim()}” em {nome}.</p>
          )}
        </div>
      )}

      <p className="text-[11px] text-ink-faint">
        A música abaixa sozinha quando alguém fala. Silenciar só para mim não afeta os outros.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => void music.enviar({ tipo: 'embaralhar', ligado: !e?.embaralhar })} className={`${botao} px-3 py-2`}>
          <Shuffle className="w-4 h-4" /> Embaralhar: {e?.embaralhar ? 'ligado' : 'desligado'}
        </button>
        {podeDispensar && (
          <>
            <button
              onClick={() => {
                if (!confirm('Dispensar a música? Ela sai do comboio para todo mundo.')) return;
                void music.enviar({ tipo: 'sair' });
                aoFechar();
              }}
              className={`${botao} px-3 py-2 text-red-400`}
            >
              Dispensar música
            </button>
            <button
              onClick={() => {
                if (!confirm(`Desvincular ${nome} deste comboio? Para voltar, alguém digita o código de novo.`)) return;
                void music.enviar({ tipo: 'sair' });
                void music.desparear();
              }}
              className="text-xs text-ink-muted hover:text-ink underline px-1"
            >
              Desvincular deste comboio
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/** Sem plugin: uma linha discreta que abre o campo do código. */
const Conectar: React.FC<{ music: MusicPlugin }> = ({ music }) => {
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-ink-muted hover:text-ink transition"
      >
        <Music className="w-3.5 h-3.5" /> Tem um plugin, como música? Conectar com código
      </button>
    );
  }

  const conectar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setEnviando(true);
    setErro(null);
    const falha = await music.parear(codigo);
    setEnviando(false);
    if (falha) setErro(falha);
    else {
      setAberto(false);
      setCodigo('');
    }
  };

  return (
    <form onSubmit={conectar} className="rounded-2xl bg-surface border border-line p-4 space-y-3">
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
