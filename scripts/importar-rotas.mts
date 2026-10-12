import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarRotasNovas } from '../packages/shared/src/domain/importacaoRotas.ts';

// Adiciona rotas pesquisadas (formato RotaCatalogo) ao catálogo local.
// Uso: npm run rotas:importar -- <rotas-novas.json> [--verificar]
const args = process.argv.slice(2);
const verificar = args.includes('--verificar');
const arquivo = args.find((a) => !a.startsWith('--'));
if (!arquivo) {
  console.error('Uso: npm run rotas:importar -- <rotas-novas.json> [--verificar]');
  process.exit(1);
}

const destino = fileURLToPath(new URL('../packages/shared/src/data/catalogoRotas.ts', import.meta.url));
const fonte = readFileSync(destino, 'utf8');
const trecho = /CATALOGO_ROTAS: readonly RotaCatalogo\[\] = \(([\s\S]*)\s+satisfies RotaCatalogo\[\]\)/.exec(fonte);
if (!trecho) throw new Error('Formato inesperado em catalogoRotas.ts.');
const catalogo = JSON.parse(trecho[1]) as { id: string }[];

let entrada: unknown;
try {
  entrada = JSON.parse(readFileSync(resolve(arquivo), 'utf8').replace(/^﻿/, ''));
} catch (erro) {
  console.error(`JSON inválido em ${arquivo}: ${(erro as Error).message}`);
  process.exit(1);
}

const { rotas, erros } = validarRotasNovas(entrada, catalogo.map((r) => r.id));
if (erros.length) {
  console.error(`${erros.length} problema(s); nada foi gravado:\n- ${erros.join('\n- ')}`);
  process.exit(1);
}
if (verificar) {
  console.log(`${rotas.length} rota(s) válida(s): ${rotas.map((r) => r.id).join(', ')}`);
  process.exit(0);
}

writeFileSync(destino, `// Gerado por scripts/importar-rotas.mts; as fontes de cada rota ainda não foram auditadas.\n` +
  `import type { RotaCatalogo } from '../domain/rotas.js';\n` +
  `import { revisarRotaCatalogo } from './revisoesRotas.js';\n\n` +
  `export const CATALOGO_ROTAS: readonly RotaCatalogo[] = (${JSON.stringify([...catalogo, ...rotas], null, 2)} satisfies RotaCatalogo[]).map(revisarRotaCatalogo);\n`, 'utf8');
console.log(`${rotas.length} rota(s) adicionada(s); catálogo com ${catalogo.length + rotas.length} rotas.`);
