/**
 * Códigos de comboio.
 *
 * O código é a sala: não existe cadastro prévio. Quem entra com um código cria
 * o comboio se ele ainda não existir, e encontra os outros se existir. Isso
 * evita banco de dados nesta etapa e casa com a arquitetura local-first —
 * o servidor só intermedia o áudio.
 *
 * O formato é pensado para ser **dito em voz alta**, que é como um piloto vai
 * passar o código para outro: no estacionamento, de capacete, ou por telefone.
 */

/**
 * Alfabeto sem caracteres que se confundem ao falar ou ao ler:
 * 0/O, 1/I/L, 5/S, 2/Z, 8/B, Q/O.
 */
const ALPHABET = 'ACDEFGHJKMNPRTUVWXY34679';

const CODE_SIZE = 6;

/**
 * Ex.: "K7M3PQ". Seis caracteres, sem hífen nem espaço.
 *
 * Até 2026-11 o código era "K7M-3PQ". O hífen ajudava a ler, mas obrigava quem
 * entra a digitar exatamente igual — e o app, que limpava o texto por conta
 * própria, transformava "K7M3PQ" numa sala diferente de "K7M-3PQ": o piloto
 * entrava sozinho num comboio vazio. Sem separador não há como errar o formato.
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_SIZE; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/**
 * Normaliza o que a pessoa digitou.
 *
 * Aceita minúsculas, espaços, hífens e pontos — quem ouviu "K7M 3PQ" vai
 * digitar de vários jeitos, e todos devem levar à mesma sala. Por isso tudo
 * que não é letra ou número sai: "k7m-3pq", "K7M 3PQ" e "K7M3PQ" são a mesma
 * sala. Vale também para códigos antigos com hífen ("SERRA-88" → "SERRA88") e
 * para links de convite já compartilhados.
 *
 * Não tenta adivinhar caracteres ambíguos. O alfabeto já exclui os pares que
 * se confundem (0/O, 1/I/L, 5/S, 2/Z, 8/B), justamente para que nenhuma
 * correção seja necessária. Se mesmo assim vier um caractere de fora, é erro
 * de transcrição sem intenção recuperável: melhor recusar e pedir de novo do
 * que chutar e jogar o piloto num comboio de estranhos.
 *
 * Toda entrada de código (campo digitado, link, último comboio salvo e o
 * próprio servidor de token) passa por aqui: se um lugar limpar diferente, o
 * mesmo código vira duas salas.
 */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Aceita o formato gerado por `generateRoomCode`. */
export function isValidRoomCode(code: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${CODE_SIZE}}$`).test(code);
}

/**
 * Códigos herdados do protótipo, como "SERRA88", não seguem o formato novo
 * mas continuam válidos para entrar. Espera o código já normalizado.
 */
export function isJoinableRoomCode(code: string): boolean {
  return /^[A-Z0-9]{3,32}$/.test(code);
}
