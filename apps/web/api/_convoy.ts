/**
 * Regras de comboio para as funções serverless.
 *
 * POR QUE ESTÁ DUPLICADO AQUI
 *
 * A fonte da verdade é `packages/shared/src/domain/convoy.ts`, consumida pela
 * web e pelo app. Mas importar esse pacote de dentro de uma função da Vercel
 * derrubava todos os endpoints com FUNCTION_INVOCATION_FAILED: o empacotador
 * de funções não lida bem com um pacote de workspace, e o erro acontece no
 * carregamento do módulo, antes de qualquer código nosso — sem log útil.
 *
 * Compilar o pacote para JavaScript não foi suficiente. Em vez de insistir
 * numa correção que só se verifica em produção, a cada deploy, estas poucas
 * regras ficam declaradas aqui.
 *
 * É duplicação consciente, não descuido. `npm run check:convoy` na raiz
 * compara os dois arquivos e falha se divergirem — ver scripts/check-convoy.mjs.
 *
 * Importações de TIPO do pacote compartilhado continuam válidas: elas somem na
 * compilação e não existem em tempo de execução.
 */

export const CONVOY_CAPACITY = 8;
export const CONVOY_ADMIN_SLOTS = 2;
export const CONVOY_MAX = CONVOY_CAPACITY + CONVOY_ADMIN_SLOTS;

/** Reduz o telefone à forma comparável. Ver domain/convoy.ts. */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '');

  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  if (digits.length > 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length < 10 || digits.length > 11) return '';

  return digits;
}

/** Decide se um piloto pode entrar. Ver domain/convoy.ts. */
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
