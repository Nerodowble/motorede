import { useCallback, useEffect, useState } from 'react';

/**
 * Tema da interface.
 *
 * Três estados, não dois: além de claro e escuro, existe "sistema", que segue a
 * preferência do aparelho e muda junto quando o celular alterna sozinho ao
 * anoitecer. É o padrão, porque respeitar o que a pessoa já configurou é melhor
 * que impor uma escolha.
 *
 * A escolha é aplicada num atributo do elemento raiz, e o CSS resolve o resto:
 * nenhum componente precisa saber qual tema está ativo.
 *
 * A escolha vive FORA do React, num módulo só. O tema aparece em dois lugares
 * que existem ao mesmo tempo — a tela de entrada e o cabeçalho de dentro do app
 * — e se cada um guardasse o próprio estado, trocar num deixaria o outro
 * mostrando o botão errado. Aqui os dois leem a mesma fonte e se avisam.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'motorede_theme';

function lerSalvo(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    return salvo === 'light' || salvo === 'dark' ? salvo : 'system';
  } catch {
    return 'system';
  }
}

function prefereEscuro(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolver(escolha: ThemeChoice): 'light' | 'dark' {
  return escolha === 'system' ? (prefereEscuro() ? 'dark' : 'light') : escolha;
}

function aplicar(escolha: ThemeChoice) {
  if (typeof document === 'undefined') return;
  const efetivo = resolver(escolha);
  document.documentElement.setAttribute('data-theme', efetivo);

  // A barra do navegador acompanha o fundo, senão fica um recorte destoando
  // no topo da tela do celular.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', efetivo === 'dark' ? '#020617' : '#f1f5f9');
}

let escolhaAtual: ThemeChoice = lerSalvo();
const ouvintes = new Set<(escolha: ThemeChoice) => void>();

function definir(proxima: ThemeChoice) {
  escolhaAtual = proxima;
  aplicar(proxima);
  try {
    if (proxima === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, proxima);
  } catch {
    // Armazenamento bloqueado: a escolha vale só para esta sessão.
  }
  ouvintes.forEach((avisar) => avisar(proxima));
}

// Em "sistema", acompanha a mudança do aparelho sem precisar recarregar.
if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (escolhaAtual === 'system') aplicar('system');
    });
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(escolhaAtual);

  useEffect(() => {
    ouvintes.add(setChoice);
    // O script do index.html já pintou a tela antes do React montar; isto só
    // garante o atributo caso aquele script não tenha rodado.
    aplicar(escolhaAtual);
    return () => {
      ouvintes.delete(setChoice);
    };
  }, []);

  const escolher = useCallback((proxima: ThemeChoice) => definir(proxima), []);

  return { choice, efetivo: resolver(choice), escolher };
}
