import { RefreshCw } from 'lucide-react';
import { LINK_APK } from './config';

/**
 * Passo a passo do APK. Fora da Play Store o Android pergunta duas ou três
 * coisas que assustam quem nunca instalou um app assim; explicar antes evita
 * o "deu erro, desisti".
 */

const PASSOS: { titulo: string; texto: string }[] = [
  {
    titulo: 'Baixe o arquivo',
    texto:
      'Toque em "Baixar para Android". Se o Chrome avisar que o arquivo pode ser perigoso, toque em "Baixar mesmo assim": o aviso aparece para qualquer app que não vem da loja.',
  },
  {
    titulo: 'Abra o APK',
    texto: 'Abra pela notificação do download ou pelo app Arquivos, na pasta Downloads.',
  },
  {
    titulo: 'Permita a instalação',
    texto:
      'Na primeira vez o Android pede para permitir "instalar apps desconhecidos" do Chrome (ou do app que abriu o arquivo). Ative e volte.',
  },
  {
    titulo: 'Se o Play Protect avisar',
    texto:
      'Ele avisa porque o MotoRede não está na Play Store, não porque achou algo errado. Toque em "Mais detalhes" e depois em "Instalar mesmo assim".',
  },
  {
    titulo: 'Abra e libere',
    texto:
      'Permita microfone (para a voz), localização (para o socorro) e notificações (para receber pedidos de socorro e manter o comboio ativo com a tela bloqueada).',
  },
];

export const ComoInstalar = () => (
  <section id="instalar" className="relative bg-placa corte-topo pt-28 pb-24 md:pt-36 md:pb-32 scroll-mt-4" aria-labelledby="titulo-instalar">
    <div className="max-w-6xl mx-auto px-5 md:px-10">
      <p className="rotulo text-sm text-sinal-texto revelar">Android</p>
      <h2 id="titulo-instalar" className="titulo mt-2 text-[clamp(2.8rem,11vw,6rem)] revelar">
        Como instalar o APK
      </h2>

      <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="relative bg-asfalto p-6 pt-5 overflow-hidden revelar">
            <span aria-hidden="true" className="titulo absolute -right-2 -top-4 text-[7rem] text-elevado select-none">
              {i + 1}
            </span>
            <span className="relative rotulo text-xs text-sinal-texto">Passo {i + 1}</span>
            <h3 className="relative titulo mt-1 text-3xl">{p.titulo}</h3>
            <p className="relative mt-3 text-giz-2 leading-relaxed">{p.texto}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex gap-4 items-start bg-asfalto p-6 border-l-4 border-sinal revelar">
        <RefreshCw className="w-7 h-7 text-sinal-texto shrink-0 mt-1" aria-hidden="true" />
        <div>
          <h3 className="titulo text-3xl">Instalou uma vez, pronto</h3>
          <p className="mt-2 text-giz-2 leading-relaxed">
            As atualizações chegam sozinhas pela internet quando você abre o app. Só numa mudança maior vai ser preciso
            baixar um APK novo, por este mesmo link.
          </p>
        </div>
      </div>

      <a href={LINK_APK} className="botao botao-principal mt-8 max-w-md revelar" rel="noopener">
        Baixar o APK agora
      </a>
    </div>
  </section>
);
