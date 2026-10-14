import { createHash } from 'node:crypto';
import type { PluginEntry } from './_plugins.js';

/**
 * Acorda um plugin. O prefixo `_` impede a Vercel de expor isto como endpoint.
 *
 * O plugin roda atrás de roteador e não pode ser chamado direto. Em vez de
 * perguntar ao MotoRede a cada poucos segundos — o que gastava a cota do Redis
 * com o computador parado —, ele deixa UMA conexão aberta e ociosa num serviço
 * de push gratuito (ntfy.sh, sem conta) e só fala com o MotoRede quando este
 * avisa que há convite ou tarefa.
 *
 * O aviso não leva dado nenhum: é só "pergunte agora". O canal tem nome
 * derivado da chave do plugin (ver `canalAcordar`); quem não sabe a chave não
 * acha o canal, e quem achar só consegue fazer o plugin perguntar à toa — a
 * tarefa continua exigindo a chave para ser recolhida.
 *
 * `MOTOREDE_ACORDAR_URL` troca o servidor (um ntfy próprio, por exemplo);
 * `desligado` desliga o aviso (testes).
 */

const PADRAO = 'https://ntfy.sh';

/**
 * Nome do canal. O plugin calcula o mesmo (cópia em `src/protocolo.ts` do
 * plugin) — mudou aqui, muda lá.
 */
export function canalAcordar(id: string, chave: string): string {
  return `mr-${createHash('sha256').update(`motorede-acordar:${id}:${chave}`).digest('hex').slice(0, 40)}`;
}

export async function acordarPlugin(plugin: PluginEntry): Promise<void> {
  const base = (process.env.MOTOREDE_ACORDAR_URL || PADRAO).replace(/\/$/, '');
  if (base === 'desligado') return;
  const canal = canalAcordar(plugin.id, plugin.chave);
  try {
    await fetch(`${base}/${canal}`, {
      method: 'POST',
      body: 'acorda',
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Sem aviso, o convite/tarefa espera a próxima conferência periódica do
    // plugin. Não derruba o pedido de quem chamou.
  }
}
