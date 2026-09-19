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

const GROUP_SIZE = 3;
const GROUPS = 2;

/** Ex.: "K7M-3PQ". Dois grupos de três, separados por hífen. */
export function generateRoomCode(): string {
  const groups: string[] = [];

  for (let g = 0; g < GROUPS; g++) {
    let group = '';
    for (let i = 0; i < GROUP_SIZE; i++) {
      group += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    groups.push(group);
  }

  return groups.join('-');
}

/**
 * Normaliza o que a pessoa digitou.
 *
 * Aceita minúsculas, espaços e código sem hífen — quem ouviu "K7M 3PQ" vai
 * digitar de vários jeitos, e todos devem levar à mesma sala.
 *
 * Não tenta adivinhar caracteres ambíguos. O alfabeto já exclui os pares que
 * se confundem (0/O, 1/I/L, 5/S, 2/Z, 8/B), justamente para que nenhuma
 * correção seja necessária. Se mesmo assim vier um caractere de fora, é erro
 * de transcrição sem intenção recuperável: melhor recusar e pedir de novo do
 * que chutar e jogar o piloto num comboio de estranhos.
 */
export function normalizeRoomCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleaned.length !== GROUP_SIZE * GROUPS) return cleaned;

  return `${cleaned.slice(0, GROUP_SIZE)}-${cleaned.slice(GROUP_SIZE)}`;
}

/** Aceita o formato gerado por `generateRoomCode`. */
export function isValidRoomCode(code: string): boolean {
  const pattern = new RegExp(
    `^[${ALPHABET}]{${GROUP_SIZE}}-[${ALPHABET}]{${GROUP_SIZE}}$`
  );
  return pattern.test(code);
}

/**
 * Códigos herdados do protótipo, como "SERRA-88", não seguem o formato novo
 * mas continuam válidos para entrar. Serve para não quebrar links já
 * compartilhados nem o canal usado nos testes.
 */
export function isJoinableRoomCode(code: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{1,30}[A-Z0-9]$/.test(code);
}
