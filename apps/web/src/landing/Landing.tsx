import { useMemo } from 'react';
import { Github, MessageSquareText } from 'lucide-react';
import { ComoInstalar } from './ComoInstalar';
import { Comparativo } from './Comparativo';
import { LINK_APP_WEB, LINK_GITHUB, LINK_RETORNO, VERSAO_APP } from './config';
import { Hero } from './Hero';
import { useMovimentoAoRolar } from './movimento';
import { detectarPlataforma } from './plataforma';
import { Recursos } from './Recursos';

/**
 * Página de divulgação do MotoRede, servida em /baixar/.
 *
 * É uma segunda página do Vite, independente do app em `/`: não carrega o
 * App, o login, nem o service worker (ver vite.config.ts). Ordem fixa:
 * hero → recursos → Android × iPhone → como instalar → rodapé.
 */
export const Landing = () => {
  // A plataforma não muda durante a visita; calcula uma vez.
  const plataforma = useMemo(detectarPlataforma, []);
  useMovimentoAoRolar();

  return (
    <div className="bg-asfalto text-giz min-h-screen">
      <Hero plataforma={plataforma} />
      <main>
        <Recursos />
        <Comparativo />
        <ComoInstalar />
      </main>

      <footer className="py-16">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <div className="border-l-4 border-sinal pl-5 max-w-2xl">
            <p className="titulo text-3xl">Versão de teste</p>
            <p className="mt-2 text-giz-2 leading-relaxed">
              O MotoRede está em beta{VERSAO_APP ? ` (app ${VERSAO_APP})` : ''}: pode ter falha, e é exatamente por isso
              que a gente quer você testando. Roda com a turma e conta o que funcionou e o que não funcionou.
            </p>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-6 text-giz-2">
            <a href={LINK_RETORNO} className="flex items-center gap-2 min-h-11 hover:text-giz" rel="noopener">
              <MessageSquareText className="w-5 h-5" aria-hidden="true" />
              Mandar retorno
            </a>
            <a href={LINK_GITHUB} className="flex items-center gap-2 min-h-11 hover:text-giz" rel="noopener">
              <Github className="w-5 h-5" aria-hidden="true" />
              Código no GitHub
            </a>
            <a href={LINK_APP_WEB} className="flex items-center gap-2 min-h-11 hover:text-giz">
              Abrir o MotoRede no navegador →
            </a>
          </div>

          <p className="mt-10 titulo text-2xl text-giz-3">
            Moto<span className="text-sinal-texto">Rede</span>
          </p>
        </div>
      </footer>
    </div>
  );
};
