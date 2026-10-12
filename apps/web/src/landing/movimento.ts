import { useEffect } from 'react';

/**
 * Movimento sutil ao rolar: as seções aparecem quando entram na tela e o hero
 * desliza um pouco mais devagar que a página.
 *
 * Feito à mão (IntersectionObserver + uma variável CSS) em vez de usar a
 * biblioteca `motion`, que já está no projeto: ela pesaria mais que a página
 * inteira, e a página precisa abrir rápido pelo 4G.
 */
export function useMovimentoAoRolar(): void {
  useEffect(() => {
    const elementos = Array.from(document.querySelectorAll<HTMLElement>('.revelar'));
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sem suporte ou sem movimento: mostra tudo de uma vez.
    if (semMovimento || !('IntersectionObserver' in window)) {
      elementos.forEach((el) => el.classList.add('visivel'));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visivel');
            observador.unobserve(entrada.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    elementos.forEach((el) => observador.observe(el));

    // Um quadro por vez: o evento de rolagem dispara muito mais que a tela
    // consegue desenhar.
    let quadro = 0;
    const aoRolar = () => {
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        const fracao = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
        document.documentElement.style.setProperty('--rolagem', fracao.toFixed(3));
      });
    };
    window.addEventListener('scroll', aoRolar, { passive: true });

    return () => {
      observador.disconnect();
      window.removeEventListener('scroll', aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, []);
}
