import type { Motorcycle } from '../types.js';

/**
 * Capa da moto: imagem de garagem feita pela IA que o próprio piloto já usa
 * (Gemini, ChatGPT ou Meta AI no celular dele).
 *
 * O MotoRede não gera imagem nem guarda chave de IA: monta o prompt, entrega a
 * foto ao app escolhido e depois recebe a imagem que o piloto salvou. Conta e
 * cota são dele. (Usar a conta Google do piloto por automação foi descartado:
 * exigiria a senha ou a sessão dele — ver docs/ideias.md.)
 *
 * A IA gera a cena SEM texto: modelos de imagem erram letras, e marca, modelo,
 * ano e apelido precisam sair exatos. O painel "GARAGE / BIKE SELECT" é
 * desenhado pelo MotoRede por cima, com os dados reais — por isso o prompt pede
 * a moto à direita e o lado esquerdo escuro e vazio.
 */

export type IaCapa = NonNullable<Motorcycle['coverAi']>;

export interface OpcaoIaCapa {
  id: IaCapa;
  nome: string;
  subtexto: string;
  pacoteAndroid: string;
  urlWeb: string;
  recomendado?: boolean;
  /**
   * Mandar o texto junto com a foto. O ChatGPT, recebendo os dois, fica só com
   * o texto e descarta a imagem; o prompt já vai copiado de qualquer forma.
   */
  enviaTexto: boolean;
  /** Passo extra quando a foto pode não chegar anexada. */
  dicaAnexo?: string;
}

export const IAS_CAPA: readonly OpcaoIaCapa[] = [
  { id: 'gemini', nome: 'Gemini', subtexto: 'Do Google. Costuma já vir no Android.', pacoteAndroid: 'com.google.android.apps.bard', urlWeb: 'https://gemini.google.com/app', recomendado: true, enviaTexto: true },
  { id: 'chatgpt', nome: 'ChatGPT', subtexto: 'Da OpenAI. Na conta grátis há um limite de imagens por dia.', pacoteAndroid: 'com.openai.chatgpt', urlWeb: 'https://chatgpt.com/', enviaTexto: false,
    dicaAnexo: 'Se a foto não aparecer anexada, toque no + e escolha a foto da moto.' },
  { id: 'metaai', nome: 'Meta AI', subtexto: 'Do Facebook/Instagram. Precisa do app Meta AI.', pacoteAndroid: 'com.facebook.stella', urlWeb: 'https://www.meta.ai/', enviaTexto: true },
];

export const APELIDO_MAX = 24;

/** Apelido limpo, ou null quando vazio. */
export function validarApelido(texto: string): string | null {
  const limpo = texto.replace(/\s+/g, ' ').trim().slice(0, APELIDO_MAX);
  return limpo || null;
}

/** Tira quebras e símbolos que poderiam virar instrução extra dentro do prompt. */
function limpar(texto: string, max: number) {
  return texto.replace(/[\r\n\t"<>{}[\]`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function montarPromptCapa(moto: Pick<Motorcycle, 'brand' | 'model' | 'year'>): string {
  const ano = Number.isInteger(moto.year) && moto.year >= 1900 && moto.year <= 2100 ? ` ${moto.year}` : '';
  const nome = `${limpar(moto.brand, 40)} ${limpar(moto.model, 60)}`.trim();
  const identificacao = nome ? ` (${nome}${ano})` : '';
  return [
    `Crie uma nova imagem a partir da foto anexada da MINHA moto${identificacao}.`,
    'A moto tem que continuar exatamente igual à da foto: mesmo modelo, carenagem, tanque, cores e grafismos, farol, rodas, pneus, escapamento, bagageiros, baú e todos os acessórios, com as mesmas proporções.',
    'Não troque o modelo, não acrescente nem tire peças e não invente logotipos ou adesivos.',
    'Coloque a moto numa garagem americana realista: piso de concreto, parede de tijolos, bancada de mecânico, armários de ferramentas, luz dramática e reflexo no chão.',
    'Você pode mudar a posição e o ângulo da moto para ela ficar bem posicionada na garagem (apoiada no descanso, de frente em 3/4, câmera baixa); o que não pode mudar são os atributos dela.',
    'A moto ocupa o lado DIREITO da imagem. Deixe o lado ESQUERDO escuro e vazio, só com a parede da garagem na sombra.',
    'Foto publicitária cinematográfica e realista. Formato quadrado.',
    'Sem nenhum texto, letra, número, logotipo, marca d\'água ou placa legível. Sem pessoas.',
  ].join(' ');
}

export const AVISO_CAPA =
  'A IA pode mudar detalhes da moto, como cor, rodas ou escapamento. Se não ficou parecida, peça de novo ou tente outra IA.';

/** Textos do assistente, iguais na web e no app. `{ia}` vira o nome da IA. */
export const TEXTOS_CAPA = {
  convite: {
    titulo: 'Capa exclusiva da sua moto',
    texto: 'Quer uma imagem exclusiva da sua moto para usar no MotoRede? A IA transforma uma foto sua numa capa de garagem, estilo jogo de corrida.',
    itens: [
      'É grátis e opcional.',
      'Precisa do app Gemini, ChatGPT ou Meta AI no celular, com a sua conta já entrada.',
      'Leva uns 3 minutos.',
    ],
    sim: 'Vamos lá',
    nao: 'Agora não',
  },
  foto: {
    titulo: 'Escolha uma foto da moto',
    texto: 'Pegue da galeria uma foto em que a moto aparece bem.',
    dicas: ['Moto inteira na foto', 'De frente ou meio de lado', 'Com luz boa, de dia'],
    escolher: 'Escolher da galeria',
    usar: 'Usar esta foto',
    outra: 'Escolher outra',
    rodape: 'Não tem foto boa agora? Tire uma com a câmera do celular e volte aqui.',
  },
  ia: {
    titulo: 'Qual IA você tem no celular?',
    continuar: 'Continuar',
    nenhuma: 'Não tenho nenhuma dessas',
    nenhumaTexto: 'Instale o Gemini, que é grátis, entre com sua conta Google e volte aqui.',
    abrirLoja: 'Abrir na loja de apps',
    abrirGemini: 'Abrir o Gemini',
  },
  naIa: {
    titulo: 'Agora é com o {ia}',
    texto: 'Vamos copiar o texto pronto e mandar sua foto para o {ia}. Lá, faça só isto:',
    passos: [
      'Toque e segure na caixa de mensagem e escolha Colar.',
      'Toque em Enviar e espere a imagem ficar pronta.',
      'Abra a imagem e toque em Baixar (ou Salvar).',
      'Volte para o MotoRede.',
    ],
    passoLista: 'Se abrir uma lista de apps, toque em {ia}.',
    botao: 'Copiar texto e abrir o {ia}',
    copiado: 'Texto copiado.',
    copiarDeNovo: 'Copiar o texto de novo',
    naoInstalado: 'O {ia} não abriu',
    naoInstaladoTitulo: 'O {ia} não está instalado?',
    naoInstaladoTexto: 'Instale pela loja de apps, entre com sua conta e volte. Ou escolha outra IA.',
    instalar: 'Instalar o {ia}',
    outraIa: 'Escolher outra IA',
    jaBaixei: 'Já baixei a imagem',
    /** Web no computador: sem enviar a foto, o piloto anexa lá. */
    computador: {
      texto: 'Copie o texto pronto e abra o {ia}. Lá, faça só isto:',
      passos: ['Anexe uma foto da moto no clipe, cole o texto e envie.', 'Baixe a imagem gerada.', 'Volte para o MotoRede.'],
      copiar: 'Copiar texto',
      abrirAba: 'Abrir o {ia} numa nova aba',
    },
  },
  gerada: {
    titulo: 'Escolha a imagem que a IA fez',
    texto: 'Ela costuma ser a mais recente da galeria.',
    escolher: 'Escolher da galeria',
    usar: 'Usar como capa',
    outra: 'Escolher outra',
    naoPronta: 'A imagem ainda não ficou pronta',
    comTexto: 'A IA escreveu texto na imagem',
    comTextoDica: 'Peça no chat: "refaça sem nenhum texto".',
    arrastar: 'Arraste a imagem aqui ou clique para escolher',
    preparando: 'Preparando a imagem…',
  },
  pronto: {
    titulo: 'Capa pronta!',
    apelido: 'Apelido da moto (opcional)',
    apelidoExemplo: 'ex: Pretinha',
    salvar: 'Salvar capa',
  },
  opcoes: {
    titulo: 'Capa da moto',
    ver: 'Ver capa inteira',
    refazer: 'Refazer com IA',
    trocar: 'Trocar por outra imagem',
    apelido: 'Mudar apelido',
    remover: 'Remover capa',
    removerConfirma: 'Remover a capa? A imagem continua na sua galeria.',
  },
} as const;

export function comIa(texto: string, ia: IaCapa): string {
  const nome = IAS_CAPA.find((i) => i.id === ia)?.nome ?? 'IA';
  return texto.replace(/\{ia\}/g, nome);
}

/** Rótulo para leitor de tela: a capa é lida como uma única imagem. */
export function rotuloCapa(moto: Pick<Motorcycle, 'brand' | 'model' | 'year' | 'nickname' | 'coverImageUrl'>): string {
  const nome = `${moto.brand} ${moto.model} ${moto.year}`.trim();
  const apelido = moto.nickname ? `, apelido ${moto.nickname}` : '';
  return moto.coverImageUrl
    ? `Capa da sua moto: ${nome}${apelido}. Imagem criada por IA.`
    : `Sua moto: ${nome}${apelido}. Sem capa.`;
}
