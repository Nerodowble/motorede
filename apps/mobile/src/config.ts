/**
 * Endereços e credenciais do app.
 *
 * O padrão é PRODUÇÃO, de propósito. Antes o padrão era o servidor local, e
 * isso produziu um erro difícil de enxergar: o app conectava no LiveKit da
 * máquina do desenvolvedor enquanto a web conectava no LiveKit Cloud. Os dois
 * mostravam "Ao vivo", ninguém via erro, e simplesmente não se ouviam.
 *
 * Para desenvolver contra o servidor local use `npm run start:local`.
 */

/** IP desta máquina na rede local, usado apenas em desenvolvimento local. */
export const DEV_HOST = '192.168.1.108';

/** Endereço do app web, usado para montar o link de convite. */
export const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://motorede-web.vercel.app';

/**
 * Endpoint que assina o token de entrada na sala.
 *
 * O cliente não sabe se quem responde é o plugin do Vite em desenvolvimento ou
 * a função serverless em produção: o contrato é o mesmo.
 */
export const TOKEN_ENDPOINT =
  process.env.EXPO_PUBLIC_TOKEN_ENDPOINT || `${WEB_APP_URL}/api/livekit-token`;

/** Lista de comboios ativos e busca de piloto por telefone. */
export const CONVOYS_ENDPOINT = `${WEB_APP_URL}/api/comboios`;

/**
 * Credenciais do Google.
 *
 * Só o Client ID, que é público por natureza. O Client Secret NÃO entra aqui:
 * qualquer pessoa consegue abrir um APK e lê-lo, então guardá-lo no app seria
 * o mesmo que publicá-lo. Por isso o fluxo usa `id_token` direto, que não
 * precisa de segredo.
 *
 * O Android exige um Client ID do tipo "Android", vinculado à impressão digital
 * do certificado. Enquanto ele não existir, cai no de web, que funciona pelo
 * navegador do sistema.
 */
export const GOOGLE_CLIENT_ID_WEB =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
  '689939201177-223qqg566f4ina9rsmrjpqf5c11psvde.apps.googleusercontent.com';

/**
 * Escrito direto no código, não em variável de ambiente, de propósito.
 *
 * Variável com prefixo EXPO_PUBLIC_ é embutida no momento do BUILD — trocá-la
 * exigiria um APK novo. Como constante, ela viaja nas atualizações pela
 * internet, e uma correção de credencial chega sem reinstalação.
 *
 * É seguro: Client ID é público por natureza. O que nunca pode entrar aqui é o
 * Client Secret, porque qualquer um abre um APK e o lê.
 */
export const GOOGLE_CLIENT_ID_ANDROID = '';

/** Comboio inicial. O piloto troca pela tela; serve só como ponto de partida. */
export const DEV_ROOM_CODE = 'SERRA-88';
