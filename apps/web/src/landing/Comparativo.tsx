import { Check, Minus } from 'lucide-react';

/**
 * Android × iPhone, sem enfeite.
 *
 * O app nativo hoje é distribuído só para Android (APK). É o navegador do
 * Android que corta o microfone quando a tela bloqueia (ideias 11 e 15 em
 * docs/ideias.md) — foi por isso que o app Android nasceu. No iPhone, o
 * navegador mantém a conversa com a tela bloqueada (confirmado pelo dono do
 * projeto em uso real; ideia 30). O app para iOS fica para depois.
 */

interface Linha {
  tema: string;
  android: string;
  iphone: string;
  /** false quando o iPhone tem um limite real nesse ponto. */
  iphoneCompleto: boolean;
}

const LINHAS: Linha[] = [
  {
    tema: 'Voz com a tela bloqueada',
    android: 'Sim, pelo app. Bloqueia, guarda no bolso e segue conversando.',
    iphone: 'Sim, pelo navegador. Bloqueia a tela e a conversa continua.',
    iphoneCompleto: true,
  },
  {
    tema: 'App nativo',
    android: 'Disponível (APK).',
    iphone: 'Em breve. Por enquanto o navegador já faz o trabalho.',
    iphoneCompleto: false,
  },
  {
    tema: 'Comboio junto',
    android: 'Mesma sala de quem está no iPhone ou no computador.',
    iphone: 'Mesma sala de quem está no Android.',
    iphoneCompleto: true,
  },
  {
    tema: 'Aviso de socorro',
    android: 'Notificação no celular.',
    iphone: 'Notificação com o MotoRede na Tela de Início (iOS 16.4 ou mais novo).',
    iphoneCompleto: true,
  },
  {
    tema: 'Rotas, moto e plugins',
    android: 'Tudo.',
    iphone: 'Tudo.',
    iphoneCompleto: true,
  },
  {
    tema: 'Como instala',
    android: 'APK por download direto (fora da Play Store).',
    iphone: 'Safari → Compartilhar → Adicionar à Tela de Início.',
    iphoneCompleto: true,
  },
  {
    tema: 'Atualizações',
    android: 'Chegam sozinhas depois de instalado.',
    iphone: 'Sempre a versão mais nova do site.',
    iphoneCompleto: true,
  },
];

const Marca = ({ ok }: { ok: boolean }) =>
  ok ? (
    <Check className="w-5 h-5 text-giz shrink-0 mt-0.5" aria-label="Funciona" />
  ) : (
    <Minus className="w-5 h-5 text-sinal-texto shrink-0 mt-0.5" aria-label="Limitado" />
  );

export const Comparativo = () => (
  <section className="relative py-24 md:py-32" aria-labelledby="titulo-comparativo">
    <div className="max-w-6xl mx-auto px-5 md:px-10">
      <p className="rotulo text-sm text-sinal-texto revelar">Papo reto</p>
      <h2 id="titulo-comparativo" className="titulo mt-2 text-[clamp(2.8rem,11vw,6rem)] revelar">
        Android <span className="text-giz-3">×</span> iPhone
      </h2>
      <p className="mt-4 max-w-2xl text-giz-2 text-lg revelar">
        No Android, o navegador corta o microfone quando a tela bloqueia — por isso existe o app Android. No iPhone, o
        navegador segura a conversa com a tela bloqueada; o app para iOS vem depois.
      </p>

      {/* Cabeçalho das colunas: só a partir do tablet. No celular cada linha
          vira um cartão com as duas respostas empilhadas. */}
      <div className="mt-10 hidden md:grid grid-cols-[1fr_1.4fr_1.4fr] gap-6 px-6 pb-3 border-b border-linha rotulo text-sm text-giz-3">
        <span />
        <span>App Android</span>
        <span>iPhone (navegador)</span>
      </div>

      <div className="mt-4 md:mt-0 space-y-3 md:space-y-0">
        {LINHAS.map((l) => (
          <div
            key={l.tema}
            className="revelar bg-placa md:bg-transparent p-5 md:px-6 md:py-5 md:grid md:grid-cols-[1fr_1.4fr_1.4fr] md:gap-6 md:border-b md:border-linha"
          >
            <h3 className="titulo text-2xl md:text-3xl">{l.tema}</h3>
            <div className="mt-3 md:mt-0 flex gap-3">
              <Marca ok />
              <p className="text-giz-2">
                <span className="md:hidden rotulo text-xs text-giz-3 block">Android</span>
                {l.android}
              </p>
            </div>
            <div className={`mt-3 md:mt-0 flex gap-3 ${l.iphoneCompleto ? '' : 'md:border-l-2 md:border-sinal md:pl-3'}`}>
              <Marca ok={l.iphoneCompleto} />
              <p className={l.iphoneCompleto ? 'text-giz-2' : 'text-giz'}>
                <span className="md:hidden rotulo text-xs text-giz-3 block">iPhone</span>
                {l.iphone}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
