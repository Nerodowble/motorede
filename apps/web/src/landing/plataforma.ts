/**
 * Descobre de onde o piloto abriu a página, para decidir qual botão destacar.
 *
 * É só uma sugestão de ordem: os dois botões continuam disponíveis em todas
 * as plataformas, então um palpite errado não tranca ninguém.
 */
export type Plataforma = 'android' | 'ios' | 'desktop';

export function detectarPlataforma(): Plataforma {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  // O iPadOS 13+ se apresenta como "Macintosh" para receber a versão de
  // desktop dos sites. O que denuncia é a tela de toque: Mac não tem.
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  return 'desktop';
}

/**
 * Navegador embutido de outro app (WhatsApp, Instagram, Facebook). É por onde
 * a maioria vai chegar, já que o link circula no WhatsApp. No iPhone, essas
 * telas não têm "Adicionar à Tela de Início"; é preciso abrir no Safari.
 */
export function navegadorEmbutido(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /whatsapp|instagram|fban|fbav|fb_iab|line\//i.test(navigator.userAgent || '');
}
