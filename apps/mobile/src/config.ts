/**
 * Endereços do ambiente de desenvolvimento.
 *
 * O celular não enxerga "localhost" — precisa do IP desta máquina na rede
 * local. Se o IP mudar (DHCP, outra rede), é aqui que se ajusta; o script
 * `npm run livekit` imprime o endereço correto ao subir.
 */
export const DEV_HOST = '192.168.1.108';

/** Endpoint que assina o token de entrada na sala (servidor de dev do Vite). */
export const TOKEN_ENDPOINT = `http://${DEV_HOST}:3000/api/livekit-token`;

/** Sala usada nos testes, a mesma que o app web abre por padrão. */
export const DEV_ROOM_CODE = 'SERRA-88';
