/**
 * Acesso ao Redis (Upstash) pela API REST, compartilhado entre socorro e
 * plugins. O prefixo `_` impede a Vercel de expor isto como endpoint.
 */

/**
 * Onde fica o Redis.
 *
 * A integração do Upstash na Vercel deixa VOCÊ escolher o prefixo das
 * variáveis que ela cria: com `KV` saem `KV_REST_API_URL` e
 * `KV_REST_API_TOKEN`, com `STORAGE` saem `STORAGE_REST_API_*`, e assim por
 * diante. Amarrar o código a um prefixo transforma uma escolha de formulário
 * em um 503 silencioso meses depois.
 *
 * Então: os nomes conhecidos primeiro e, se nenhum aparecer, procura qualquer
 * par `*_REST_API_URL` / `*_REST_API_TOKEN` no ambiente. `KV_URL` é
 * deliberadamente ignorada — apesar do nome parecido, ela é uma string de
 * conexão `redis://`, que não serve para a API REST.
 */
function acharCredenciais(): { url?: string; token?: string } {
  const env = process.env;

  const explicito = {
    url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN,
  };
  if (explicito.url && explicito.token) return explicito;

  const prefixo = Object.keys(env)
    .filter((k) => k.endsWith('_REST_API_URL') && env[k])
    .map((k) => k.slice(0, -'_REST_API_URL'.length))
    .find((p) => env[`${p}_REST_API_TOKEN`]);

  if (prefixo) {
    return { url: env[`${prefixo}_REST_API_URL`], token: env[`${prefixo}_REST_API_TOKEN`] };
  }
  return explicito;
}

const { url: REST_URL, token: REST_TOKEN } = acharCredenciais();

export function storeConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

/**
 * Executa comandos no Redis pela API REST do Upstash.
 *
 * REST em vez de biblioteca de propósito: a função serverless sobe e morre a
 * cada chamada, e abrir conexão TCP nesse ciclo custa mais que o próprio
 * trabalho. Também evita mais uma dependência no pacote.
 */
export async function redis<T = unknown>(comandos: (string | number)[][]): Promise<T[]> {
  if (!REST_URL || !REST_TOKEN) throw new Error('Armazenamento de presença não configurado.');

  const resposta = await fetch(`${REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(comandos),
  });

  if (!resposta.ok) {
    throw new Error(`Redis respondeu ${resposta.status}: ${await resposta.text()}`);
  }

  const corpo = (await resposta.json()) as Array<{ result?: T; error?: string }>;
  const falha = corpo.find((linha) => linha.error);
  if (falha) throw new Error(`Redis: ${falha.error}`);
  return corpo.map((linha) => linha.result as T);
}
