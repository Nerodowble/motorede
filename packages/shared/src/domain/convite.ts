/**
 * Convite para o aplicativo (não para um comboio).
 *
 * Aponta para a página /baixar, que serve aos dois públicos: no Android tem o
 * APK; no iPhone, onde o app nativo não é distribuído, ensina a pôr a web na
 * tela de início. Mandar direto para o APK deixaria quem usa iPhone sem saída.
 *
 * O texto mora aqui para o app e a web convidarem com as mesmas palavras.
 */
export function linkDeDownload(base: string): string {
  return `${base.replace(/\/+$/, '')}/baixar/`;
}

export function mensagemConviteApp(base: string): string {
  return `Bora usar o MotoRede? Comboio por voz, socorro entre motociclistas e a manutenção da moto, de graça.

Baixe aqui: ${linkDeDownload(base)}`;
}
