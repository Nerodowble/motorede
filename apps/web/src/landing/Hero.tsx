import { Chamadas } from './Chamadas';
import type { Plataforma } from './plataforma';

/**
 * Abertura: marca, frase de impacto e os dois botões.
 *
 * O selo é o `marca-pino.png` (54 KB) com o nome escrito em texto, e não o
 * `marca-logo.png` inteiro (218 KB): a página abre pelo 4G e o hero é a
 * primeira coisa a desenhar. As faixas diagonais e as barras de voz são CSS.
 */
export const Hero = ({ plataforma }: { plataforma: Plataforma }) => (
  <header className="relative min-h-[100svh] flex flex-col overflow-hidden bg-asfalto">
    {/* Fundo: duas faixas diagonais e uma grade bem apagada. */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(#f4f4f5 1px, transparent 1px), linear-gradient(90deg, #f4f4f5 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* O deslocamento fica num contêiner e a inclinação nas faixas: as
          duas usam `transform`, e na mesma camada uma apagaria a outra. */}
      <div className="paralaxe absolute inset-0">
        <div className="absolute -right-1/3 top-[-10%] h-[130%] w-[70%] md:w-[45%] -skew-x-[18deg] bg-gradient-to-b from-sinal/25 via-sinal/10 to-transparent" />
        <div className="absolute right-[12%] md:right-[30%] top-[-10%] h-[130%] w-3 md:w-5 -skew-x-[18deg] bg-sinal" />
      </div>
    </div>

    <div className="relative z-10 flex-1 flex flex-col w-full max-w-6xl mx-auto px-5 md:px-10 pt-6 pb-16">
      <div className="flex items-center gap-3">
        <img src="/marca-pino.png" alt="" width={44} height={44} className="w-11 h-11 rounded-xl" />
        <span className="titulo text-3xl tracking-tight">
          Moto<span className="text-sinal-texto">Rede</span>
        </span>
        <span className="rotulo ml-auto text-[0.7rem] px-2 py-1 border border-sinal text-sinal-texto">Beta</span>
      </div>

      <div className="flex-1 flex flex-col justify-center pt-14 md:pt-20">
        <p className="rotulo text-sm text-giz-2 revelar">Comboio por voz · versão de teste</p>
        <h1 className="titulo mt-3 text-[clamp(3.6rem,17vw,10rem)] revelar">
          Roda junto.
          <br />
          <span className="text-sinal-texto">Fala junto.</span>
        </h1>

        <div className="mt-6 flex items-end gap-5 revelar">
          <p className="text-lg md:text-xl text-giz-2 max-w-xl leading-snug">
            O grupo inteiro conversando pelo fone Bluetooth do capacete, até 8 pilotos na mesma sala. No app Android ou no
            iPhone pelo navegador, a conversa segue com a <strong className="text-giz">tela bloqueada</strong> e o celular
            no bolso.
          </p>
          <div aria-hidden="true" className="onda hidden sm:flex items-end gap-1.5 h-16 text-sinal shrink-0">
            {[0, 0.2, 0.45, 0.1, 0.35, 0.6, 0.25].map((atraso) => (
              <span key={atraso} style={{ animationDelay: `${atraso}s` }} />
            ))}
          </div>
        </div>

        <div className="mt-9 revelar">
          <Chamadas plataforma={plataforma} />
        </div>
      </div>
    </div>
  </header>
);
