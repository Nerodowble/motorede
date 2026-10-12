import { useCallback, useEffect, useRef, useState } from 'react';
import type { EstadoFicha } from '@motorede/shared';
import { API_BASE } from '../config';

/**
 * Ficha do modelo pesquisada por IA (ver packages/shared/src/domain/fichaMoto.ts).
 *
 * Espelho do hook da web (apps/web/src/hooks/useFichaMoto.ts): mesma
 * lógica, só muda o endereço da API. Mudou lá, muda aqui.
 *
 * A IA roda num computador de casa e leva de segundos a um minuto. Enquanto
 * o servidor diz "pendente", pergunta de novo a cada poucos segundos; depois
 * de 3 min desiste e diz isso, em vez de girar para sempre.
 */

const ENDPOINT = `${API_BASE}/ficha-moto`;
const INTERVALO_MS = 4_000;
const DESISTE_MS = 3 * 60_000;

export type SituacaoFicha =
  | EstadoFicha
  | { estado: 'ocioso' }
  | { estado: 'demorou' }
  | { estado: 'erro'; mensagem: string };

export function useFichaMoto(marca: string | undefined, modelo: string | undefined, ano: number | undefined) {
  const [situacao, setSituacao] = useState<SituacaoFicha>({ estado: 'ocioso' });
  /** Incrementa a cada pesquisa ou troca de moto: a pesquisa antiga para sozinha. */
  const geracao = useRef(0);

  useEffect(() => {
    geracao.current++;
    setSituacao({ estado: 'ocioso' });
  }, [marca, modelo, ano]);
  useEffect(() => () => void geracao.current++, []);

  const pesquisar = useCallback(async () => {
    if (!marca || !modelo || !ano) return;
    const minha = ++geracao.current;
    const inicio = Date.now();
    setSituacao({ estado: 'pendente' });

    while (minha === geracao.current) {
      let r: SituacaoFicha;
      try {
        const resp = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marca, modelo, ano }),
        });
        const corpo = (await resp.json().catch(() => ({}))) as EstadoFicha & { error?: string };
        r = resp.ok ? corpo : { estado: 'erro', mensagem: corpo.error || 'Não deu para pesquisar agora.' };
      } catch {
        r = { estado: 'erro', mensagem: 'Sem conexão com o MotoRede.' };
      }
      if (minha !== geracao.current) return;
      if (r.estado !== 'pendente') return setSituacao(r);
      if (Date.now() - inicio > DESISTE_MS) return setSituacao({ estado: 'demorou' });
      await new Promise((ok) => setTimeout(ok, INTERVALO_MS));
    }
  }, [marca, modelo, ano]);

  return { situacao, pesquisar };
}
