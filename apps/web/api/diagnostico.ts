import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Endpoint temporário de diagnóstico.
 *
 * Os outros endpoints estão caindo com FUNCTION_INVOCATION_FAILED, que é falha
 * no CARREGAMENTO do módulo — acontece antes de qualquer código nosso, então
 * nenhum try/catch normal pega, e nenhum log aparece.
 *
 * O contorno: este arquivo não importa nada no topo. Cada dependência é
 * carregada dinamicamente dentro de um try, o que transforma a falha de
 * carregamento em erro capturável e legível.
 *
 * REMOVER assim que a causa for identificada.
 */

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const resultados: Record<string, string> = {};

  const alvos: Array<[string, () => Promise<unknown>]> = [
    ['livekit-server-sdk', () => import('livekit-server-sdk')],
    ['google-auth-library', () => import('google-auth-library')],
    ['node:crypto', () => import('node:crypto')],
    ['./_convoy', () => import('./_convoy')],
    ['./_livekit', () => import('./_livekit')],
    ['@motorede/shared', () => import('@motorede/shared')],
  ];

  for (const [nome, carregar] of alvos) {
    try {
      const mod = (await carregar()) as Record<string, unknown>;
      const chaves = Object.keys(mod).slice(0, 5).join(', ');
      resultados[nome] = `ok (${chaves})`;
    } catch (err) {
      const e = err as { message?: string; code?: string };
      resultados[nome] = `FALHOU [${e.code || 'sem código'}] ${String(e.message || err).slice(0, 300)}`;
    }
  }

  // Quais variáveis de ambiente existem (apenas se estão definidas).
  const variaveis: Record<string, boolean> = {};
  for (const v of [
    'LIVEKIT_URL',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'GOOGLE_CLIENT_ID',
    'ADMIN_EMAILS',
    'REQUIRE_AUTH',
  ]) {
    variaveis[v] = Boolean(process.env[v]);
  }

  res.status(200).json({
    node: process.version,
    modulos: resultados,
    variaveis,
  });
}
