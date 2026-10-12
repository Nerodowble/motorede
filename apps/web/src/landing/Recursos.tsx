import type { ReactNode } from 'react';
import { Headphones, LifeBuoy, Map, Music2, Wrench } from 'lucide-react';

/**
 * O que o MotoRede faz hoje.
 *
 * Honestidade é regra do projeto (AGENTS.md): cada frase aqui foi conferida
 * em README.md e docs/arquitetura.md. Nada de número de usuários, nota de
 * loja ou recurso que ainda não existe. Ao mudar um recurso no app, confira
 * se o texto continua verdadeiro.
 */

interface Recurso {
  icone: ReactNode;
  titulo: string;
  texto: ReactNode;
  nota?: string;
}

const RECURSOS: Recurso[] = [
  {
    icone: <LifeBuoy className="w-7 h-7" />,
    titulo: 'Socorro por perto',
    texto: (
      <>
        Quebrou ou caiu? O pedido avisa os pilotos da rede de socorro num raio de até 50 km. Eles veem só a região
        aproximada, nunca o ponto exato. O local certo e o seu telefone vão <strong>só para quem você aceitar</strong>.
      </>
    ),
  },
  {
    icone: <Map className="w-7 h-7" />,
    titulo: 'Rotas',
    texto: (
      <>
        Catálogo de rotas com filtros de região, extensão, pavimento e curvas, favoritas salvas no aparelho e conta de
        combustível e pedágio do trecho. A navegação abre no Google Maps ou no Waze.
      </>
    ),
    nota: 'Catálogo inicial, ainda em revisão',
  },
  {
    icone: <Wrench className="w-7 h-7" />,
    titulo: 'Minha moto',
    texto: (
      <>
        Ficha da moto e histórico de manutenção. A próxima troca é calculada pelo que você registrou, sem número
        inventado. Tudo fica guardado no seu aparelho.
      </>
    ),
  },
  {
    icone: <Music2 className="w-7 h-7" />,
    titulo: 'Música no comboio',
    texto: (
      <>
        Plugins de áudio entram na sala como um participante a mais e tocam para o grupo, como um tocador de música.
        O pareamento é por código, e o plugin não escuta a conversa.
      </>
    ),
    nota: 'Em teste',
  },
];

export const Recursos = () => (
  <section className="relative bg-placa corte py-28 md:py-36" aria-labelledby="titulo-recursos">
    <div className="max-w-6xl mx-auto px-5 md:px-10">
      <p className="rotulo text-sm text-sinal-texto revelar">O que tem no MotoRede</p>
      <h2 id="titulo-recursos" className="titulo mt-2 text-[clamp(2.8rem,11vw,6rem)] revelar">
        Feito pra estrada
      </h2>

      {/* O comboio é o centro do produto: ganha o bloco grande. */}
      <article className="mt-10 relative bg-asfalto p-6 md:p-10 border-l-4 border-sinal revelar">
        <div className="flex items-center gap-3 text-sinal-texto">
          <Headphones className="w-8 h-8" aria-hidden="true" />
          <span className="rotulo text-sm">O principal</span>
        </div>
        <h3 className="titulo mt-3 text-5xl md:text-6xl">Comboio por voz</h3>
        <ul className="mt-5 grid gap-3 md:grid-cols-2 text-giz-2 text-base md:text-lg">
          <li>
            <strong className="text-giz">Até 8 pilotos</strong> na mesma conversa, em tempo real.
          </li>
          <li>
            Funciona com o <strong className="text-giz">fone Bluetooth comum de capacete</strong>; não precisa de
            intercomunicador.
          </li>
          <li>
            Entra com um <strong className="text-giz">código curto</strong>, fácil de falar em voz alta ou mandar no
            grupo.
          </li>
          <li>
            Continua com a tela bloqueada no <strong className="text-giz">app Android</strong> e no{' '}
            <strong className="text-giz">iPhone pelo navegador</strong>. Quem está no app e quem
            está no navegador entram na mesma sala.
          </li>
        </ul>
      </article>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {RECURSOS.map((r) => (
          <article key={r.titulo} className="bg-asfalto p-6 md:p-8 revelar">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sinal-texto" aria-hidden="true">
                {r.icone}
              </span>
              {r.nota && <span className="rotulo text-[0.7rem] text-giz-3 border border-linha px-2 py-1">{r.nota}</span>}
            </div>
            <h3 className="titulo mt-4 text-4xl">{r.titulo}</h3>
            <p className="mt-3 text-giz-2 leading-relaxed">{r.texto}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
