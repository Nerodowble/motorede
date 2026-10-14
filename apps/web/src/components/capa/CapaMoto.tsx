import React from 'react';
import { Images, Sparkles } from 'lucide-react';
import { rotuloCapa, type Motorcycle } from '@motorede/shared';
import { HudGaragem } from './HudGaragem';

/**
 * Capa do painel da moto: a imagem de garagem feita pela IA do piloto, com o
 * HUD do MotoRede por cima. Sem capa, o mesmo espaço vira o convite.
 *
 * No celular encosta nas bordas e se funde com o fundo da página (é a "capa"
 * do app, não um cartão); no computador vira cartão 4:3. A moto fica à
 * direita e o recorte sai do lado esquerdo, o escuro — ela nunca é cortada.
 */

const ESCURO = 'rgba(10,10,11,';

/** Silhueta simples de moto, para o convite (o lucide não tem moto). */
const SilhuetaMoto: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="24" cy="50" r="15" />
    <circle cx="96" cy="50" r="15" />
    <path d="M24 50 L46 30 H70 L82 42 M96 50 L84 22 H74 M46 30 L56 50 H74 L82 42 M60 30 L66 20 H80" />
  </svg>
);

export const CapaMoto: React.FC<{
  motorcycle: Motorcycle;
  /** Imagem em prévia (assistente); por padrão, a capa salva. */
  imagem?: string;
  /** Prévia pequena dentro do assistente: sem botões e sem sangrar as bordas. */
  compacta?: boolean;
  onCriar?: () => void;
  onOpcoes?: () => void;
  onDarApelido?: () => void;
  onVerInteira?: () => void;
}> = ({ motorcycle, imagem, compacta = false, onCriar, onOpcoes, onDarApelido, onVerInteira }) => {
  const capa = imagem ?? motorcycle.coverImageUrl;
  const moldura = compacta
    ? 'rounded-xl border border-line aspect-square w-full'
    : '-mx-3 -mt-4 sm:mx-0 sm:mt-0 h-[clamp(400px,100vw,520px)] sm:h-auto sm:aspect-[4/3] sm:rounded-2xl sm:border sm:border-line';

  return (
    <section data-tema-fixo="escuro" className={`relative overflow-hidden bg-canvas ${moldura}`}>
      {/* A camada visual é lida como uma imagem só; os botões ficam fora dela. */}
      <div role="img" aria-label={rotuloCapa({ ...motorcycle, coverImageUrl: capa })} className="absolute inset-0">
      {capa ? (
        <img src={capa} alt="" className="absolute inset-0 w-full h-full object-cover object-right sm:object-[100%_60%]" />
      ) : motorcycle.photoUrl ? (
        <img src={motorcycle.photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-right opacity-45" />
      ) : (
        <div className="absolute inset-0 bg-surface" aria-hidden="true">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 45%, var(--mr-elevated) 0%, transparent 55%)' }} />
          <div className="absolute w-[46%] text-ink-faint opacity-35" style={{ left: '47%', top: '28%' }}>
            <SilhuetaMoto />
          </div>
        </div>
      )}
      </div>

      {/* Tocar na imagem abre a capa inteira, sem recorte. */}
      {capa && onVerInteira && (
        <button type="button" onClick={onVerInteira} aria-label="Ver capa inteira" className="absolute inset-0 cursor-zoom-in" />
      )}

      {/* Legibilidade do painel, do título e fusão com a página. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${ESCURO}${capa ? '0.88' : '0.92'}) 0%, ${ESCURO}${capa ? '0.6' : '0.7'}) 38%, ${ESCURO}0) 62%)` }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${ESCURO}0.55) 0%, ${ESCURO}0) 22%)` }} />
        {compacta ? (
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${ESCURO}0.85) 0%, ${ESCURO}0) 30%)` }} />
        ) : (
          <>
            <div className="absolute inset-0 sm:hidden" style={{ background: 'linear-gradient(to top, var(--mr-canvas-pagina) 0%, transparent 32%)' }} />
            <div className="absolute inset-0 hidden sm:block" style={{ background: `linear-gradient(to top, ${ESCURO}0.85) 0%, ${ESCURO}0) 30%)` }} />
          </>
        )}
      </div>

      <HudGaragem
        brand={motorcycle.brand}
        model={motorcycle.model}
        year={motorcycle.year}
        nickname={motorcycle.nickname}
        comApelido={!!capa}
        onDarApelido={compacta ? undefined : onDarApelido}
        compacto={compacta}
      />

      {capa ? (
        <>
          {/* Marca d'água: o canto de cima à direita fica livre (o painel está à esquerda). */}
          <span
            aria-hidden="true"
            className={`absolute ${compacta ? 'top-3 right-3' : 'top-4 right-4'} inline-flex items-center gap-1.5 opacity-90 pointer-events-none select-none`}
          >
            <img src="/marca-pino.png" alt="" width={28} height={28} className={`${compacta ? 'w-6 h-6' : 'w-7 h-7'} rounded-md`} />
            <span className={`${compacta ? 'text-xs' : 'text-sm'} font-black italic tracking-tight leading-none`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
              <span className="text-white">MOTO</span><span className="text-[#FC0D0A]">REDE</span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`absolute ${compacta ? 'bottom-3 left-3' : 'bottom-4 left-4'} h-7 px-3 rounded-full border border-line-strong inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] text-ink pointer-events-none`}
            style={{ background: `${ESCURO}0.6)` }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ink" />
            OWNED
          </span>
          {!compacta && onOpcoes && (
            <button
              type="button"
              onClick={onOpcoes}
              aria-label="Opções da capa"
              className="absolute bottom-3 right-3 w-12 h-12 rounded-xl border border-line inline-flex items-center justify-center text-ink hover:border-line-strong"
              style={{ background: `${ESCURO}0.6)` }}
            >
              <Images className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </>
      ) : (
        !compacta && onCriar && (
          <div className="absolute inset-x-4 bottom-4 space-y-2">
            <p className="text-[13px] text-ink-muted" aria-hidden="true">Opcional. Grátis, usando uma IA do seu celular.</p>
            <button
              type="button"
              onClick={onCriar}
              aria-label="Criar capa com IA, opcional"
              className="w-full h-14 rounded-xl bg-action text-on-action font-bold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition"
            >
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              Criar capa com IA
            </button>
          </div>
        )
      )}
    </section>
  );
};
