/**
 * Garante que as regras de comboio duplicadas nas funções serverless continuem
 * iguais às do pacote compartilhado.
 *
 * A duplicação existe porque importar @motorede/shared de dentro de uma função
 * da Vercel derruba o endpoint no carregamento do módulo. O risco de duplicar é
 * a divergência silenciosa: alguém muda o limite num lugar e não no outro, e o
 * cliente passa a mostrar uma regra diferente da que o servidor aplica.
 *
 * Este script compara as partes que importam e falha se divergirem.
 * Roda com: npm run check:convoy
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const fonte = readFileSync(
  join(raiz, 'packages/shared/src/domain/convoy.ts'),
  'utf-8'
);
const copia = readFileSync(join(raiz, 'apps/web/api/_convoy.ts'), 'utf-8');

const problemas = [];

// --- constantes ---
for (const nome of ['CONVOY_CAPACITY', 'CONVOY_ADMIN_SLOTS']) {
  const padrao = new RegExp(`export const ${nome} = (\\d+);`);
  const a = fonte.match(padrao)?.[1];
  const b = copia.match(padrao)?.[1];
  if (a === undefined || b === undefined) {
    problemas.push(`${nome}: não encontrado em ${a === undefined ? 'shared' : 'api'}`);
  } else if (a !== b) {
    problemas.push(`${nome}: shared=${a} mas api=${b}`);
  }
}

// --- corpo das funções, ignorando comentários e espaçamento ---
function corpo(texto, nome) {
  const inicio = texto.indexOf(`export function ${nome}`);
  if (inicio === -1) return null;
  let profundidade = 0;
  let i = texto.indexOf('{', inicio);
  const abre = i;
  for (; i < texto.length; i++) {
    if (texto[i] === '{') profundidade++;
    else if (texto[i] === '}') {
      profundidade--;
      if (profundidade === 0) break;
    }
  }
  return texto
    .slice(abre, i + 1)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const nome of ['normalizePhone', 'canJoinConvoy']) {
  const a = corpo(fonte, nome);
  const b = corpo(copia, nome);
  if (!a || !b) {
    problemas.push(`${nome}: não encontrado em ${!a ? 'shared' : 'api'}`);
  } else if (a !== b) {
    problemas.push(`${nome}: implementações divergentes entre shared e api`);
  }
}

if (problemas.length > 0) {
  console.error('\nRegras de comboio divergiram entre o pacote compartilhado e as funções:\n');
  for (const p of problemas) console.error('  - ' + p);
  console.error('\nAjuste apps/web/api/_convoy.ts para refletir');
  console.error('packages/shared/src/domain/convoy.ts.\n');
  process.exit(1);
}

console.log('Regras de comboio conferem entre shared e api.');
