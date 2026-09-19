/**
 * Endereços do servidor de voz.
 *
 * Em desenvolvimento apontamos para esta máquina na rede local — o celular não
 * enxerga "localhost". Em builds publicados, o endereço vem de
 * EXPO_PUBLIC_TOKEN_ENDPOINT, embutido no bundle no momento do build.
 *
 * Se o IP local mudar (outra rede, novo DHCP), é aqui que se ajusta; o script
 * `npm run livekit` imprime o endereço correto ao subir.
 */

/** IP desta máquina na rede local, usado apenas em desenvolvimento. */
export const DEV_HOST = '192.168.1.108';

const DEV_TOKEN_ENDPOINT = `http://${DEV_HOST}:3000/api/livekit-token`;

/**
 * Endpoint que assina o token de entrada na sala.
 *
 * O cliente não sabe (nem precisa saber) se quem responde é o plugin do Vite
 * em desenvolvimento ou a função serverless em produção: o contrato é o mesmo.
 */
export const TOKEN_ENDPOINT =
  process.env.EXPO_PUBLIC_TOKEN_ENDPOINT || DEV_TOKEN_ENDPOINT;

/** Sala usada nos testes, a mesma que o app web abre por padrão. */
export const DEV_ROOM_CODE = 'SERRA-88';
