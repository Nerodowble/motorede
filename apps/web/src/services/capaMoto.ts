/**
 * Ferramentas do navegador para a capa da moto: reduzir a imagem, copiar o
 * prompt e entregar a foto à IA pelo compartilhamento do sistema.
 *
 * A capa vai como data URL junto da moto no localStorage (são ~5 MB no total,
 * e a moto aparece em mais de uma chave). Por isso a imagem é reduzida para no
 * máximo 1080 px e JPEG 85% — fica entre 150 e 400 KB.
 */

export const LADO_MAXIMO_CAPA = 1080;

export async function reduzirImagem(arquivo: Blob, ladoMaximo = LADO_MAXIMO_CAPA, qualidade = 0.85): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error('Não deu para abrir essa imagem. Tente outra (JPG ou PNG).'));
      i.src = url;
    });
    const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', qualidade);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegador antigo ou sem permissão: o caminho de sempre.
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand('copy');
    campo.remove();
    return ok;
  }
}

/** Celular com compartilhamento de arquivo: a foto vai direto para a IA. */
export function compartilhaArquivos(): boolean {
  return typeof navigator !== 'undefined'
    && typeof navigator.canShare === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
}

export type ResultadoCompartilhar = 'ok' | 'cancelado' | 'indisponivel';

export async function compartilharFoto(foto: File, titulo: string): Promise<ResultadoCompartilhar> {
  if (!navigator.canShare?.({ files: [foto] })) return 'indisponivel';
  try {
    await navigator.share({ files: [foto], title: titulo });
    return 'ok';
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelado' : 'indisponivel';
  }
}

/**
 * Testa se a capa cabe no localStorage antes de salvar a moto: falhar no meio
 * deixaria a tela com uma capa que some ao recarregar.
 */
export function capaCabe(dataUrl: string): boolean {
  const chave = 'motorede_teste_capa';
  try {
    // A moto é gravada em até três chaves (moto, usuário atual, lista).
    localStorage.setItem(chave, dataUrl + dataUrl + dataUrl);
    localStorage.removeItem(chave);
    return true;
  } catch {
    localStorage.removeItem(chave);
    return false;
  }
}

export const ERRO_ESPACO_CAPA =
  'Não há espaço neste navegador para guardar a imagem. Tente uma imagem menor ou libere espaço do site.';

export function linkLoja(pacoteAndroid: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pacoteAndroid)}`;
}
