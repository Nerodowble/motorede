import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ImageUp, X } from 'lucide-react';

/**
 * Peças de apresentação do assistente da capa: a janela, os botões e a área
 * de soltar imagem. A lógica dos passos fica em AssistenteCapa.
 */

export const botaoPrincipal =
  'w-full min-h-14 rounded-xl bg-action text-on-action font-bold text-sm inline-flex items-center justify-center gap-2 px-4 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-40 disabled:pointer-events-none';
export const botaoSecundario =
  'w-full min-h-14 rounded-xl border border-line-strong text-ink font-bold text-sm inline-flex items-center justify-center gap-2 px-4 hover:bg-elevated transition';
export const botaoFantasma =
  'w-full min-h-12 rounded-xl text-ink-muted font-semibold text-sm inline-flex items-center justify-center gap-2 px-3 hover:text-ink hover:bg-elevated/60 transition';
export const botaoPerigo =
  'w-full min-h-14 rounded-xl border border-danger/50 text-danger font-bold text-sm inline-flex items-center justify-center gap-2 px-4 hover:bg-danger/10 transition';

/** Janela modal nativa (<dialog>): foco preso, Esc fecha, fundo travado. */
export const JanelaCapa: React.FC<{
  titulo: string;
  /** "Passo N de M"; ausente no convite e nas opções. */
  passo?: string;
  fechar: () => void;
  telaCheia?: boolean;
  children: React.ReactNode;
}> = ({ titulo, passo, fechar, telaCheia = false, children }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const aoFechar = useRef(fechar);
  aoFechar.current = fechar;

  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  // A cada passo o foco volta ao título, para o leitor de tela ler o novo passo.
  useEffect(() => {
    tituloRef.current?.focus();
  }, [titulo, passo]);

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby="janela-capa-titulo"
      onCancel={(e) => {
        e.preventDefault();
        aoFechar.current();
      }}
      className={`${telaCheia ? 'h-dvh max-h-dvh w-screen max-w-none rounded-none bg-black' : 'max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg rounded-3xl bg-surface'} m-auto p-0 border border-line text-ink backdrop:bg-black/80`}
    >
      <header className={`sticky top-0 z-10 ${telaCheia ? 'bg-black' : 'bg-surface'} border-b border-line px-5 py-3 flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          {passo && <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">{passo}</p>}
          <h2 id="janela-capa-titulo" ref={tituloRef} tabIndex={-1} className="text-lg font-extrabold leading-snug outline-none">
            {titulo}
          </h2>
        </div>
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="w-12 h-12 shrink-0 rounded-xl inline-flex items-center justify-center text-ink-muted hover:bg-elevated hover:text-ink"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </header>
      <div className="p-5 space-y-5">{children}</div>
    </dialog>,
    document.body
  );
};

/** Lista numerada de instruções, em círculos. */
export const PassosNumerados: React.FC<{ itens: readonly string[] }> = ({ itens }) => (
  <ol className="space-y-3">
    {itens.map((texto, i) => (
      <li key={texto} className="flex items-start gap-3">
        <span className="w-7 h-7 shrink-0 rounded-full bg-elevated text-ink text-sm font-extrabold inline-flex items-center justify-center" aria-hidden="true">
          {i + 1}
        </span>
        <span className="text-base text-ink leading-snug pt-0.5">{texto}</span>
      </li>
    ))}
  </ol>
);

/** Clique para escolher ou arraste a imagem para cá. */
export const AreaImagem: React.FC<{
  rotulo: string;
  aoEscolher: (arquivo: File) => void;
}> = ({ rotulo, aoEscolher }) => {
  const entrada = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = React.useState(false);
  const receber = (arquivos: FileList | null) => {
    const arquivo = arquivos?.[0];
    if (arquivo && arquivo.type.startsWith('image/')) aoEscolher(arquivo);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobre(false);
          receber(e.dataTransfer.files);
        }}
        className={`w-full min-h-36 rounded-2xl border-2 border-dashed ${sobre ? 'border-ink bg-elevated' : 'border-line-strong'} flex flex-col items-center justify-center gap-2 p-4 text-ink hover:bg-elevated/60 transition`}
      >
        <ImageUp className="w-7 h-7 text-ink-muted" aria-hidden="true" />
        <span className="font-bold text-sm">{rotulo}</span>
      </button>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          receber(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
};
