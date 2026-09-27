import { Platform } from 'react-native';

/**
 * Tema do MotoRede.
 *
 * A paleta sai da logo: preto, branco e o vermelho do pino. Cada cor além
 * dessas tem UM significado, e só aparece quando ele vale — é isso que deixa
 * o piloto entender a tela de relance, de capacete:
 *
 * - speaking (âmbar): alguém falando. Mais nada é âmbar.
 * - live (verde): microfone aberto / ao vivo. Mais nada é verde.
 * - sos (vermelho cheio): pedir socorro e chamado ativo. Botão comum nunca é
 *   vermelho, senão o vermelho deixa de querer dizer emergência.
 * - brand: a marca (logo, aba ativa, foco). Não leva texto pequeno em cima.
 *
 * Hoje o app é só escuro. As cores estão num objeto por tema, com o mesmo
 * formato, para que o claro entre depois sem mexer nas telas.
 */

export interface Paleta {
  /** Fundo da tela. */
  canvas: string;
  /** Cartões. */
  surface: string;
  /** Botão secundário, campo de texto, chip. */
  elevated: string;
  /** Divisórias e borda de cartão. */
  line: string;
  /** Borda de campo e de controle: ≥3:1 contra surface e elevated. */
  lineStrong: string;
  ink: string;
  inkMuted: string;
  /** O mais apagado permitido para texto. Abaixo disso falha contraste. */
  inkFaint: string;
  /** Botão principal: fundo claro, texto escuro. */
  action: string;
  onAction: string;
  brand: string;
  brandText: string;
  speaking: string;
  onSpeaking: string;
  live: string;
  onLive: string;
  sos: string;
  onSos: string;
  /** Erros e ações destrutivas, sempre como texto. */
  dangerText: string;
  /** Véu atrás de folhas e janelas. */
  overlay: string;
  /** Fundo do cartão de chamado ativo: sos bem diluído. */
  sosTint: string;
  /** Sombra de ícone sobre fundo claro/colorido (ex.: dentro do microfone aberto). */
  veuSobreCor: string;
}

const escuro: Paleta = {
  canvas: '#0A0A0B',
  surface: '#141417',
  elevated: '#1F1F23',
  line: '#26262B',
  // #3A3A41 dava só ~1,6:1 contra surface; este passa de 3:1 contra surface e
  // elevated, o mínimo para a borda de um campo ser vista.
  lineStrong: '#6B6B74',
  ink: '#F4F4F5',
  inkMuted: '#A1A1AA',
  inkFaint: '#8B8B94',
  action: '#F4F4F5',
  onAction: '#0A0A0B',
  brand: '#FC0D0A',
  brandText: '#FF4A3D',
  speaking: '#FBBF24',
  onSpeaking: '#0A0A0B',
  live: '#22C55E',
  onLive: '#0A0A0B',
  sos: '#DC2626',
  onSos: '#FFFFFF',
  dangerText: '#F87171',
  overlay: 'rgba(0,0,0,0.8)',
  sosTint: 'rgba(220,38,38,0.12)',
  veuSobreCor: 'rgba(10,10,11,0.12)',
};

/** Tema em uso. Quando houver o claro, isto passa a vir da preferência. */
export const COLORS: Paleta = escuro;

/** Escala de espaçamento: só estes valores, para o ritmo ficar igual em tudo. */
export const ESPACO = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const RAIO = { sm: 10, md: 14, lg: 18, pill: 999 } as const;

/**
 * Alvos de toque. O piloto usa de luva: 48 é o mínimo de qualquer coisa
 * tocável, 56 o padrão de botão, 64+ o que se usa em movimento.
 */
export const ALVO = { min: 48, botao: 56, grande: 64, mic: 76 } as const;

/**
 * Fonte condensada para o código do comboio: cabe grande numa linha e lembra
 * placa. Ambas vêm com o sistema — nenhuma fonte nova no APK.
 */
export const FONTE_CONDENSADA = Platform.select({
  android: 'sans-serif-condensed',
  ios: 'AvenirNextCondensed-Bold',
  default: undefined,
});

/** Tipografia com hierarquia fixa: título, seção, corpo, apoio, rótulo. */
export const TIPO = {
  titulo: { fontSize: 24, fontWeight: '800' as const, color: COLORS.ink },
  tituloCard: { fontSize: 18, fontWeight: '800' as const, color: COLORS.ink },
  corpo: { fontSize: 15, color: COLORS.ink },
  apoio: { fontSize: 13, lineHeight: 19, color: COLORS.inkMuted },
  // Caixa-alta com espaçamento: nomeia a seção sem competir com o conteúdo.
  rotulo: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: COLORS.inkMuted,
  },
} as const;
