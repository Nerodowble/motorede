import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Clock, ExternalLink, Info, Smartphone, Sparkles, Sun, Scan, ArrowLeftRight, Copy, ChevronLeft } from 'lucide-react';
import {
  IAS_CAPA, TEXTOS_CAPA, AVISO_CAPA, APELIDO_MAX, comIa, montarPromptCapa, validarApelido,
  type IaCapa, type Motorcycle,
} from '@motorede/shared';
import { CapaMoto } from './CapaMoto';
import { AreaImagem, JanelaCapa, PassosNumerados, botaoFantasma, botaoPrincipal, botaoSecundario } from './PassosCapa';
import {
  capaCabe, compartilhaArquivos, compartilharFoto, copiarTexto, linkLoja, reduzirImagem, ERRO_ESPACO_CAPA,
} from '../../services/capaMoto';

/**
 * Assistente da capa: o MotoRede prepara, o piloto gera na IA dele.
 *
 * No celular a foto vai pelo compartilhamento do sistema e o prompt fica
 * copiado. No computador não há como entregar a foto a outro site: o piloto
 * abre a IA numa aba, anexa a foto lá e cola o texto.
 *
 * O passo e a IA escolhida ficam no sessionStorage: no celular o navegador
 * pode recarregar a página enquanto o piloto está no app da IA.
 */

export type PassoCapa = 'convite' | 'foto' | 'ia' | 'naIa' | 'gerada' | 'pronto';

export interface CapaSalva {
  coverImageUrl: string;
  coverAi?: IaCapa;
  nickname?: string;
}

const chaveProgresso = (motoId: string) => `motorede_capa_assistente:${motoId}`;

function lerProgresso(motoId: string): { passo: PassoCapa; ia: IaCapa | null } | null {
  try {
    const bruto = sessionStorage.getItem(chaveProgresso(motoId));
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export const AssistenteCapa: React.FC<{
  motorcycle: Motorcycle;
  inicio?: PassoCapa;
  onFechar: () => void;
  onSalvar: (capa: CapaSalva) => void;
}> = ({ motorcycle, inicio = 'convite', onFechar, onSalvar }) => {
  const celular = useMemo(() => compartilhaArquivos(), []);
  const ordem: PassoCapa[] = celular ? ['foto', 'ia', 'naIa', 'gerada', 'pronto'] : ['ia', 'naIa', 'gerada', 'pronto'];

  const [passo, setPasso] = useState<PassoCapa>(() => {
    const salvo = inicio === 'convite' ? lerProgresso(motorcycle.id) : null;
    // Sem a foto (perdida na recarga), o celular volta para escolhê-la.
    if (salvo?.passo === 'gerada' || salvo?.passo === 'pronto') return 'gerada';
    if (salvo?.passo === 'naIa') return celular ? 'foto' : 'naIa';
    return inicio === 'foto' && !celular ? 'ia' : inicio;
  });
  const [ia, setIa] = useState<IaCapa | null>(() => lerProgresso(motorcycle.id)?.ia ?? motorcycle.coverAi ?? null);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPrevia, setFotoPrevia] = useState<string | null>(null);
  const [imagem, setImagem] = useState<string | null>(null);
  const [apelido, setApelido] = useState(motorcycle.nickname ?? '');
  const [copiado, setCopiado] = useState(false);
  const [naoInstalado, setNaoInstalado] = useState(false);
  const [semCompartilhar, setSemCompartilhar] = useState(!celular);
  const [nenhumaIa, setNenhumaIa] = useState(false);
  const [dicaTexto, setDicaTexto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const prompt = useMemo(() => montarPromptCapa(motorcycle), [motorcycle]);
  const opcaoIa = IAS_CAPA.find((o) => o.id === ia) ?? null;
  const t = (texto: string) => (ia ? comIa(texto, ia) : texto.replace(/\{ia\}/g, 'IA'));

  useEffect(() => {
    try {
      sessionStorage.setItem(chaveProgresso(motorcycle.id), JSON.stringify({ passo, ia }));
    } catch {
      // sem sessionStorage o assistente só não sobrevive a uma recarga
    }
  }, [passo, ia, motorcycle.id]);

  useEffect(() => () => {
    if (fotoPrevia) URL.revokeObjectURL(fotoPrevia);
  }, [fotoPrevia]);

  const fechar = () => {
    try {
      sessionStorage.removeItem(chaveProgresso(motorcycle.id));
    } catch {
      // ignorado
    }
    onFechar();
  };

  const ir = (proximo: PassoCapa) => {
    setErro('');
    setNaoInstalado(false);
    setPasso(proximo);
  };
  const voltar = () => {
    const i = ordem.indexOf(passo);
    ir(i > 0 ? ordem[i - 1] : 'convite');
  };
  const rotuloPasso = ordem.includes(passo) ? `Passo ${ordem.indexOf(passo) + 1} de ${ordem.length}` : undefined;

  const copiar = async () => {
    setCopiado(await copiarTexto(prompt));
  };

  const enviarParaIa = async () => {
    if (!foto || !ia) return;
    await copiar();
    const r = await compartilharFoto(foto, t('Enviar para o {ia}'));
    if (r === 'ok') ir('gerada');
    else if (r === 'indisponivel') setSemCompartilhar(true);
  };

  const receberGerada = async (arquivo: File) => {
    setErro('');
    setCarregando(true);
    try {
      setImagem(await reduzirImagem(arquivo));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para abrir essa imagem.');
    } finally {
      setCarregando(false);
    }
  };

  const salvar = () => {
    if (!imagem) return;
    if (!capaCabe(imagem)) {
      setErro(ERRO_ESPACO_CAPA);
      return;
    }
    try {
      sessionStorage.removeItem(chaveProgresso(motorcycle.id));
    } catch {
      // ignorado
    }
    onSalvar({ coverImageUrl: imagem, coverAi: ia ?? undefined, nickname: validarApelido(apelido) ?? undefined });
  };

  const Voltar = () => (
    <button type="button" onClick={voltar} className={botaoFantasma}>
      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      Voltar
    </button>
  );
  const Erro = () => (erro ? <p role="alert" className="text-sm text-danger">{erro}</p> : null);

  if (passo === 'convite') {
    const c = TEXTOS_CAPA.convite;
    const icones = [CheckCircle2, Smartphone, Clock];
    return (
      <JanelaCapa titulo={c.titulo} fechar={fechar}>
        <p className="text-base text-ink leading-relaxed">{c.texto}</p>
        <ul className="space-y-3">
          {c.itens.map((item, i) => {
            const Icone = icones[i];
            return (
              <li key={item} className="flex items-start gap-3 text-[15px] text-ink">
                <Icone className="w-5 h-5 shrink-0 text-ink-muted mt-0.5" aria-hidden="true" />
                {item}
              </li>
            );
          })}
        </ul>
        <div className="space-y-2">
          <button type="button" className={botaoPrincipal} onClick={() => ir(ordem[0])}>
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            {c.sim}
          </button>
          <button type="button" className={botaoFantasma} onClick={fechar}>{c.nao}</button>
        </div>
      </JanelaCapa>
    );
  }

  if (passo === 'foto') {
    const f = TEXTOS_CAPA.foto;
    const icones = [Scan, ArrowLeftRight, Sun];
    return (
      <JanelaCapa titulo={f.titulo} passo={rotuloPasso} fechar={fechar}>
        <p className="text-base text-ink-muted">{f.texto}</p>
        {fotoPrevia ? (
          <>
            <img src={fotoPrevia} alt="Foto escolhida da moto" className="w-full aspect-[4/3] object-cover rounded-xl border border-line" />
            <div className="space-y-2">
              <button type="button" className={botaoPrincipal} onClick={() => ir('ia')}>{f.usar}</button>
              <AreaImagem rotulo={f.outra} aoEscolher={(a) => { setFoto(a); setFotoPrevia(URL.createObjectURL(a)); }} />
            </div>
          </>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-2">
              {f.dicas.map((dica, i) => {
                const Icone = icones[i];
                return (
                  <li key={dica} className="rounded-xl bg-elevated p-3 text-center text-xs font-semibold text-ink">
                    <Icone className="w-5 h-5 mx-auto mb-1.5 text-ink-muted" aria-hidden="true" />
                    {dica}
                  </li>
                );
              })}
            </ul>
            <AreaImagem rotulo={f.escolher} aoEscolher={(a) => { setFoto(a); setFotoPrevia(URL.createObjectURL(a)); }} />
            <p className="text-sm text-ink-muted">{f.rodape}</p>
          </>
        )}
        <Voltar />
      </JanelaCapa>
    );
  }

  if (passo === 'ia') {
    const p = TEXTOS_CAPA.ia;
    return (
      <JanelaCapa titulo={p.titulo} passo={rotuloPasso} fechar={fechar}>
        <div role="radiogroup" aria-label={p.titulo} className="space-y-2">
          {IAS_CAPA.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={ia === o.id}
              onClick={() => setIa(o.id)}
              className={`w-full min-h-16 rounded-xl border ${ia === o.id ? 'border-ink bg-elevated' : 'border-line-strong'} px-4 py-3 flex items-center gap-3 text-left transition`}
            >
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 font-bold text-ink">
                  {o.nome}
                  {o.recomendado && <span className="text-[11px] font-bold rounded-full bg-elevated border border-line px-2 py-0.5">Recomendado</span>}
                </span>
                <span className="block text-sm text-ink-muted">{o.subtexto}</span>
              </span>
              <span className={`w-5 h-5 shrink-0 rounded-full border-2 ${ia === o.id ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" className={botaoPrincipal} disabled={!ia} onClick={() => ir('naIa')}>{p.continuar}</button>
        <button type="button" className={botaoFantasma} onClick={() => setNenhumaIa(!nenhumaIa)} aria-expanded={nenhumaIa}>{p.nenhuma}</button>
        {nenhumaIa && (
          <div className="rounded-xl bg-elevated p-4 space-y-3">
            <p className="text-sm text-ink">{p.nenhumaTexto}</p>
            <a href={celular ? linkLoja(IAS_CAPA[0].pacoteAndroid) : IAS_CAPA[0].urlWeb} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
              {celular ? p.abrirLoja : p.abrirGemini}
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        )}
        {ordem[0] !== 'ia' && <Voltar />}
      </JanelaCapa>
    );
  }

  if (passo === 'naIa' && opcaoIa) {
    const n = TEXTOS_CAPA.naIa;
    if (naoInstalado) {
      return (
        <JanelaCapa titulo={t(n.naoInstaladoTitulo)} passo={rotuloPasso} fechar={fechar}>
          <p className="text-base text-ink">{n.naoInstaladoTexto}</p>
          <a href={celular ? linkLoja(opcaoIa.pacoteAndroid) : opcaoIa.urlWeb} target="_blank" rel="noopener noreferrer" className={botaoPrincipal}>
            {t(n.instalar)}
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
          <button type="button" className={botaoSecundario} onClick={() => ir('ia')}>{n.outraIa}</button>
        </JanelaCapa>
      );
    }
    return (
      <JanelaCapa titulo={t(n.titulo)} passo={rotuloPasso} fechar={fechar}>
        {semCompartilhar ? (
          <>
            <p className="text-base text-ink">{t(n.computador.texto)}</p>
            <PassosNumerados
              itens={[...n.computador.passos]}
            />
            <div className="space-y-2">
              <button type="button" className={botaoSecundario} onClick={copiar}>
                {copiado ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                {copiado ? n.copiado : n.computador.copiar}
              </button>
              <a href={opcaoIa.urlWeb} target="_blank" rel="noopener noreferrer" className={botaoSecundario} onClick={() => void copiar()}>
                {t(n.computador.abrirAba)}
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
              <button type="button" className={botaoPrincipal} onClick={() => ir('gerada')}>{n.jaBaixei}</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-base text-ink">{t(n.texto)}</p>
            <PassosNumerados itens={[t(n.passoLista), ...(opcaoIa.dicaAnexo ? [opcaoIa.dicaAnexo] : []), ...n.passos]} />
            <button type="button" className={botaoPrincipal} onClick={() => void enviarParaIa()}>
              <ExternalLink className="w-5 h-5" aria-hidden="true" />
              {t(n.botao)}
            </button>
            {copiado && <p role="status" className="text-sm text-success">{n.copiado}</p>}
            <button type="button" className={botaoSecundario} onClick={() => ir('gerada')}>{n.jaBaixei}</button>
            <button type="button" className={botaoFantasma} onClick={() => setNaoInstalado(true)}>{t(n.naoInstalado)}</button>
          </>
        )}
        <button type="button" className={botaoFantasma} onClick={copiar}>{n.copiarDeNovo}</button>
        <Voltar />
      </JanelaCapa>
    );
  }

  if (passo === 'gerada' || (passo === 'naIa' && !opcaoIa)) {
    const g = TEXTOS_CAPA.gerada;
    return (
      <JanelaCapa titulo={g.titulo} passo={rotuloPasso} fechar={fechar}>
        <p className="text-base text-ink-muted">{g.texto}</p>
        {imagem ? (
          <>
            <CapaMoto motorcycle={{ ...motorcycle, nickname: validarApelido(apelido) ?? undefined }} imagem={imagem} compacta />
            <div className="space-y-2">
              <button type="button" className={botaoPrincipal} onClick={() => ir('pronto')}>{g.usar}</button>
              <button type="button" className={botaoSecundario} onClick={() => setImagem(null)}>{g.outra}</button>
            </div>
          </>
        ) : (
          <AreaImagem rotulo={carregando ? g.preparando : celular ? g.escolher : g.arrastar} aoEscolher={(a) => void receberGerada(a)} />
        )}
        <Erro />
        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {AVISO_CAPA}
        </p>
        {ia && <button type="button" className={botaoFantasma} onClick={() => ir('naIa')}>{g.naoPronta}</button>}
        <button type="button" className={botaoFantasma} onClick={() => setDicaTexto(!dicaTexto)} aria-expanded={dicaTexto}>{g.comTexto}</button>
        {dicaTexto && <p className="text-sm text-ink rounded-xl bg-elevated p-3">{g.comTextoDica}</p>}
      </JanelaCapa>
    );
  }

  // pronto
  const p = TEXTOS_CAPA.pronto;
  return (
    <JanelaCapa titulo={p.titulo} passo={rotuloPasso} fechar={fechar}>
      {imagem && <CapaMoto motorcycle={{ ...motorcycle, nickname: validarApelido(apelido) ?? undefined }} imagem={imagem} compacta />}
      <label className="block space-y-2">
        <span className="text-sm text-ink-muted">{p.apelido}</span>
        <input
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          maxLength={APELIDO_MAX}
          placeholder={p.apelidoExemplo}
          className="w-full min-h-12 rounded-xl border border-line-strong bg-canvas px-3 text-ink placeholder-ink-faint focus:outline-none focus:border-ink"
        />
      </label>
      <Erro />
      <button type="button" className={botaoPrincipal} disabled={!imagem} onClick={salvar}>
        <Check className="w-5 h-5" aria-hidden="true" />
        {p.salvar}
      </button>
      <Voltar />
    </JanelaCapa>
  );
};
