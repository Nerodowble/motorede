import { normalizeRoomCode, isJoinableRoomCode } from '@motorede/shared';
import { storageService } from './storage';

/**
 * Regras do código do comboio e do convite, num lugar só.
 *
 * O painel inicial e a tela do comboio precisam concordar sobre QUAL comboio é
 * "o seu": se o painel mostrasse um código e o botão "Entrar" conectasse em
 * outro, o piloto entraria na sala errada sem perceber. Por isso as duas telas
 * leem daqui, em vez de cada uma repetir a precedência.
 */

/**
 * Código do comboio ativo. Um link de convite (?sala=) vence o último comboio
 * salvo — senão quem recebe o convite cai na própria sala anterior em vez da
 * do amigo.
 */
export function codigoInicialDoComboio(reserva: string): string {
  const doLink = new URLSearchParams(window.location.search).get('sala');
  if (doLink) {
    const normalizado = normalizeRoomCode(doLink);
    if (isJoinableRoomCode(normalizado)) return normalizado;
  }
  return storageService.getLastRoomCode() || reserva;
}

export function linkDoConvite(codigo: string): string {
  return `${window.location.origin}/?sala=${codigo}`;
}

/**
 * Convida alguém para o comboio.
 *
 * No celular usa a folha de compartilhamento do sistema, que cai direto no
 * WhatsApp — que é por onde um convite de comboio realmente circula. Onde isso
 * não existe (ou a pessoa cancela), copia o link.
 *
 * @returns 'compartilhado' quando a folha do sistema abriu, 'copiado' quando
 *   caiu na cópia — a tela usa isso para mostrar "Copiado".
 */
export async function compartilharConvite(codigo: string): Promise<'compartilhado' | 'copiado'> {
  const url = linkDoConvite(codigo);
  const texto = `Entra no meu comboio no MotoRede

Código: ${codigo}
${url}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Comboio MotoRede', text: texto, url });
      return 'compartilhado';
    } catch {
      // Cancelado pelo usuário ou indisponível: segue para a cópia.
    }
  }

  await navigator.clipboard?.writeText(url).catch(() => undefined);
  return 'copiado';
}
