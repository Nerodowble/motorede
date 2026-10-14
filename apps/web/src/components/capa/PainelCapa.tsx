import React, { useState } from 'react';
import { Eye, ImagePlus, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { TEXTOS_CAPA, APELIDO_MAX, validarApelido, type Motorcycle } from '@motorede/shared';
import { CapaMoto } from './CapaMoto';
import { AssistenteCapa, type CapaSalva, type PassoCapa } from './AssistenteCapa';
import { JanelaCapa, botaoFantasma, botaoPerigo, botaoPrincipal, botaoSecundario } from './PassosCapa';

/**
 * Capa da moto e tudo que se abre a partir dela: o assistente, as opções,
 * a imagem inteira e o apelido. Mantém MyMotorcycleView só com a composição.
 */

type Janela =
  | { tipo: 'assistente'; inicio: PassoCapa }
  | { tipo: 'opcoes' }
  | { tipo: 'remover' }
  | { tipo: 'inteira' }
  | { tipo: 'apelido' };

export const PainelCapa: React.FC<{
  motorcycle: Motorcycle;
  onSaveMotorcycle: (moto: Motorcycle) => void;
}> = ({ motorcycle, onSaveMotorcycle }) => {
  const [janela, setJanela] = useState<Janela | null>(null);
  const [apelido, setApelido] = useState('');
  const [erro, setErro] = useState('');
  const fechar = () => setJanela(null);
  const o = TEXTOS_CAPA.opcoes;

  const salvarMoto = (moto: Motorcycle): boolean => {
    try {
      onSaveMotorcycle(moto);
      return true;
    } catch {
      setErro('Não deu para salvar neste navegador. Libere espaço do site e tente de novo.');
      return false;
    }
  };

  const salvarCapa = (capa: CapaSalva) => {
    const ok = salvarMoto({
      ...motorcycle,
      coverImageUrl: capa.coverImageUrl,
      coverAi: capa.coverAi ?? motorcycle.coverAi,
      coverUpdatedAt: new Date().toISOString(),
      nickname: capa.nickname,
    });
    if (ok) fechar();
  };

  const abrirApelido = () => {
    setApelido(motorcycle.nickname ?? '');
    setJanela({ tipo: 'apelido' });
  };

  return (
    <>
      <CapaMoto
        motorcycle={motorcycle}
        onCriar={() => setJanela({ tipo: 'assistente', inicio: 'convite' })}
        onOpcoes={() => setJanela({ tipo: 'opcoes' })}
        onDarApelido={abrirApelido}
        onVerInteira={() => setJanela({ tipo: 'inteira' })}
      />
      {erro && <p role="alert" className="text-sm text-danger px-1">{erro}</p>}

      {janela?.tipo === 'assistente' && (
        <AssistenteCapa motorcycle={motorcycle} inicio={janela.inicio} onFechar={fechar} onSalvar={salvarCapa} />
      )}

      {janela?.tipo === 'opcoes' && (
        <JanelaCapa titulo={o.titulo} fechar={fechar}>
          <div className="space-y-2">
            <button type="button" className={botaoSecundario} onClick={() => setJanela({ tipo: 'inteira' })}>
              <Eye className="w-5 h-5" aria-hidden="true" />{o.ver}
            </button>
            <button type="button" className={botaoSecundario} onClick={() => setJanela({ tipo: 'assistente', inicio: 'foto' })}>
              <Sparkles className="w-5 h-5" aria-hidden="true" />{o.refazer}
            </button>
            <button type="button" className={botaoSecundario} onClick={() => setJanela({ tipo: 'assistente', inicio: 'gerada' })}>
              <ImagePlus className="w-5 h-5" aria-hidden="true" />{o.trocar}
            </button>
            <button type="button" className={botaoSecundario} onClick={abrirApelido}>
              <Pencil className="w-5 h-5" aria-hidden="true" />{o.apelido}
            </button>
            <button type="button" className={botaoPerigo} onClick={() => setJanela({ tipo: 'remover' })}>
              <Trash2 className="w-5 h-5" aria-hidden="true" />{o.remover}
            </button>
          </div>
        </JanelaCapa>
      )}

      {janela?.tipo === 'remover' && (
        <JanelaCapa titulo={o.remover} fechar={fechar}>
          <p className="text-base text-ink">{o.removerConfirma}</p>
          <div className="space-y-2">
            <button
              type="button"
              className={botaoPerigo}
              onClick={() => {
                const { coverImageUrl: _imagem, coverAi: _ia, coverUpdatedAt: _em, ...semCapa } = motorcycle;
                if (salvarMoto(semCapa)) fechar();
              }}
            >
              <Trash2 className="w-5 h-5" aria-hidden="true" />Remover
            </button>
            <button type="button" className={botaoFantasma} onClick={fechar}>Cancelar</button>
          </div>
        </JanelaCapa>
      )}

      {janela?.tipo === 'inteira' && motorcycle.coverImageUrl && (
        <JanelaCapa titulo="Capa inteira" fechar={fechar} telaCheia>
          <img
            src={motorcycle.coverImageUrl}
            alt={`Capa da ${motorcycle.brand} ${motorcycle.model}, imagem criada por IA`}
            className="w-full max-h-[calc(100dvh-8rem)] object-contain mx-auto"
          />
        </JanelaCapa>
      )}

      {janela?.tipo === 'apelido' && (
        <JanelaCapa titulo={o.apelido} fechar={fechar}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (salvarMoto({ ...motorcycle, nickname: validarApelido(apelido) ?? undefined })) fechar();
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm text-ink-muted">{TEXTOS_CAPA.pronto.apelido}</span>
              <input
                autoFocus
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                maxLength={APELIDO_MAX}
                placeholder={TEXTOS_CAPA.pronto.apelidoExemplo}
                className="w-full min-h-12 rounded-xl border border-line-strong bg-canvas px-3 text-ink placeholder-ink-faint focus:outline-none focus:border-ink"
              />
            </label>
            <button type="submit" className={botaoPrincipal}>Salvar</button>
          </form>
        </JanelaCapa>
      )}
    </>
  );
};
