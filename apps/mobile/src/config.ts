/**
 * Endereços do servidor de voz.
 *
 * O padrão é PRODUÇÃO, de propósito. Antes o padrão era o servidor local, e
 * isso produziu um erro difícil de enxergar: o app conectava no LiveKit da
 * máquina do desenvolvedor enquanto a web conectava no LiveKit Cloud. Os dois
 * mostravam "Ao vivo", ninguém via erro nenhum, e simplesmente não se ouviam —
 * porque estavam em servidores diferentes.
 *
 * Para desenvolver contra o servidor local, defina a variável ao subir o Metro:
 *
 *   EXPO_PUBLIC_TOKEN_ENDPOINT=http://192.168.1.108:3000/api/livekit-token npm start
 *
 * ou use `npm run start:local`, que já faz isso.
 */

/** IP desta máquina na rede local, usado apenas em desenvolvimento local. */
export const DEV_HOST = '192.168.1.108';

/** Endereço do app web, usado para montar o link de convite. */
export const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://motorede-web.vercel.app';

/**
 * Endpoint que assina o token de entrada na sala.
 *
 * O cliente não sabe (nem precisa saber) se quem responde é o plugin do Vite
 * em desenvolvimento ou a função serverless em produção: o contrato é o mesmo.
 */
export const TOKEN_ENDPOINT =
  process.env.EXPO_PUBLIC_TOKEN_ENDPOINT || `${WEB_APP_URL}/api/livekit-token`;

/** Comboio inicial. O piloto troca pela tela; serve só como ponto de partida. */
export const DEV_ROOM_CODE = 'SERRA-88';
