/**
 * Regras de lotação e identificação de comboio.
 */

/** Pilotos comuns por comboio. */
export const CONVOY_CAPACITY = 8;

/**
 * Vagas reservadas a administradores.
 *
 * Num evento com dezenas de comboios, o organizador precisa circular para
 * passar recados. Sem reserva, ele não entraria num grupo já cheio. Com ela,
 * entra sem estourar o limite real de conversa.
 */
export const CONVOY_ADMIN_SLOTS = 2;

/** Teto absoluto da sala, incluindo as vagas de administrador. */
export const CONVOY_MAX = CONVOY_CAPACITY + CONVOY_ADMIN_SLOTS;

/**
 * Reduz o telefone à forma comparável.
 *
 * As pessoas digitam de todo jeito: "(11) 98765-4321", "+55 11 98765 4321",
 * "011987654321". Todas precisam achar a mesma pessoa.
 *
 * Devolve apenas dígitos, sem o código do país e sem o zero de operadora.
 * Retorna string vazia quando não sobra um número plausível.
 */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '');

  // Código do Brasil no início, quando ainda sobra número suficiente.
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  // Zero de operadora em ligações interurbanas.
  if (digits.length > 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // DDD + 8 (fixo antigo) ou DDD + 9 (celular).
  if (digits.length < 10 || digits.length > 11) return '';

  return digits;
}

/** Formata para exibição: (11) 98765-4321. */
export function formatPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (!d) return digits;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const meio = resto.length === 9 ? resto.slice(0, 5) : resto.slice(0, 4);
  const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4);
  return `(${ddd}) ${meio}-${fim}`;
}

/** Um comboio ativo, como o navegador de comboios enxerga. */
export interface ActiveConvoy {
  code: string;
  /** Pilotos comuns conectados (não conta administradores em trânsito). */
  riders: number;
  /** Total conectado, incluindo administradores. */
  total: number;
  /** true quando não cabe mais piloto comum. */
  isFull: boolean;
  /** Momento de criação da sala (ISO). */
  createdAt?: string;
}

/** Decide se um piloto pode entrar, dadas a lotação atual e a condição dele. */
export function canJoinConvoy(
  ridersConnected: number,
  totalConnected: number,
  isAdmin: boolean
): { allowed: boolean; reason?: string } {
  if (isAdmin) {
    if (totalConnected >= CONVOY_MAX) {
      return { allowed: false, reason: 'Comboio cheio, inclusive as vagas de apoio.' };
    }
    return { allowed: true };
  }

  if (ridersConnected >= CONVOY_CAPACITY) {
    return {
      allowed: false,
      reason: `Comboio lotado (${CONVOY_CAPACITY} pilotos). Entre em outro ou crie o seu.`,
    };
  }

  return { allowed: true };
}
