import { useEffect, useState } from 'react';
import { Download, Globe, Share, SquarePlus } from 'lucide-react';
import { LINK_APK, LINK_APP_WEB, VERSAO_APP } from './config';
import { navegadorEmbutido, type Plataforma } from './plataforma';

/**
 * Os dois botões principais, ordenados pela plataforma de quem abriu:
 * Android vê o APK primeiro; iPhone vê "Usar no navegador" e o passo a passo
 * da Tela de Início; computador vê os dois lado a lado e um QR code para
 * abrir esta página no celular.
 */

const BotaoApk = ({ destaque }: { destaque: boolean }) => (
  <a href={LINK_APK} className={`botao ${destaque ? 'botao-principal' : 'botao-secundario'}`} rel="noopener">
    <Download className="w-6 h-6 shrink-0" aria-hidden="true" />
    <span className="flex flex-col leading-none">
      <span>Baixar para Android</span>
      <span className="mt-1 text-xs font-semibold tracking-wider opacity-70 normal-case font-corpo">
        APK{VERSAO_APP ? ` · versão ${VERSAO_APP}` : ''} · download direto
      </span>
    </span>
  </a>
);

const BotaoWeb = ({ destaque }: { destaque: boolean }) => (
  <a href={LINK_APP_WEB} className={`botao ${destaque ? 'botao-principal' : 'botao-secundario'}`}>
    <Globe className="w-6 h-6 shrink-0" aria-hidden="true" />
    <span className="flex flex-col leading-none">
      <span>Usar no navegador</span>
      <span className="mt-1 text-xs font-semibold tracking-wider opacity-70 normal-case font-corpo">
        iPhone ou quem não quer instalar
      </span>
    </span>
  </a>
);

/** "Adicionar à Tela de Início" no Safari, que é como o iPhone "instala". */
const PassosIphone = () => (
  <div className="mt-5 border-l-2 border-sinal pl-4">
    <p className="rotulo text-xs text-giz-2">No iPhone, deixe com cara de app</p>
    {navegadorEmbutido() && (
      <p className="mt-2 text-sm text-giz">
        Abriu pelo WhatsApp ou Instagram? Toque nos três pontinhos (ou no ícone de bússola) e escolha{' '}
        <strong>abrir no Safari</strong> primeiro.
      </p>
    )}
    <ol className="mt-3 space-y-2 text-sm text-giz-2">
      <li className="flex gap-3">
        <span className="titulo text-xl text-sinal-texto w-4">1</span>
        <span>Toque em <strong className="text-giz">Usar no navegador</strong> (no Safari).</span>
      </li>
      <li className="flex gap-3">
        <span className="titulo text-xl text-sinal-texto w-4">2</span>
        <span>
          Toque em <Share className="inline w-4 h-4 -mt-1 text-giz" aria-label="Compartilhar" />{' '}
          <strong className="text-giz">Compartilhar</strong>, na barra do Safari.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="titulo text-xl text-sinal-texto w-4">3</span>
        <span>
          Escolha <SquarePlus className="inline w-4 h-4 -mt-1 text-giz" aria-hidden="true" />{' '}
          <strong className="text-giz">Adicionar à Tela de Início</strong>. Pronto: o ícone do MotoRede aparece junto dos
          outros apps.
        </span>
      </li>
    </ol>
  </div>
);

/**
 * QR code desta página, para quem abriu no computador passar para o celular.
 * A biblioteca `qrcode` já é usada no convite do comboio; aqui ela é
 * carregada sob demanda, só no computador, para não pesar no celular.
 */
const QrDaPagina = () => {
  const [imagem, setImagem] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    const url = `${window.location.origin}/baixar/`;
    import('qrcode')
      .then((m) => m.default.toDataURL(url, { margin: 1, width: 360, color: { dark: '#0a0a0b', light: '#f4f4f5' } }))
      .then((dados) => ativo && setImagem(dados))
      .catch(() => {
        // Sem QR não tem problema: os botões continuam aí.
      });
    return () => {
      ativo = false;
    };
  }, []);
  if (!imagem) return null;
  return (
    <div className="hidden md:flex items-center gap-4 mt-8">
      <img src={imagem} alt="QR code para abrir esta página no celular" className="w-28 h-28 bg-giz p-1" />
      <p className="text-sm text-giz-2 max-w-[16rem]">
        Aponte a câmera do celular para abrir esta página nele e instalar por lá.
      </p>
    </div>
  );
};

export const Chamadas = ({ plataforma }: { plataforma: Plataforma }) => {
  if (plataforma === 'ios') {
    return (
      <div>
        <div className="flex flex-col gap-3 max-w-md">
          <BotaoWeb destaque />
        </div>
        <PassosIphone />
        <p className="mt-4 text-sm text-giz-2">
          <strong className="text-giz">App para iPhone: em breve.</strong> Pelo navegador a conversa já continua com a
          tela bloqueada.
        </p>
        <p className="mt-5 text-sm text-giz-3">
          Tem amigo no Android?{' '}
          <a href={LINK_APK} className="underline text-giz-2 hover:text-giz">
            O APK está aqui
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={`flex flex-col gap-3 ${plataforma === 'desktop' ? 'md:flex-row max-w-3xl' : 'max-w-md'}`}>
        <BotaoApk destaque />
        <BotaoWeb destaque={false} />
      </div>
      {plataforma === 'android' && (
        <p className="mt-4 text-sm text-giz-3">
          Não está na Play Store: é um arquivo para instalar direto. O passo a passo está{' '}
          <a href="#instalar" className="underline text-giz-2 hover:text-giz">
            mais abaixo
          </a>
          .
        </p>
      )}
      {plataforma === 'desktop' && <QrDaPagina />}
    </div>
  );
};
