import { useCallback, useState } from 'react';
import type { ActiveConvoy } from '@motorede/shared';
import { CONVOYS_ENDPOINT } from '../config';

/**
 * Comboios ativos e busca de piloto por telefone.
 *
 * Mesmo endpoint que a web usa. Nada vem de banco: a API de servidor do LiveKit
 * já sabe quais salas existem e quem está em cada uma, e o dado só importa
 * enquanto a pessoa está conectada — que é quando alguém quer encontrá-la.
 */

export interface ConvoySearchHit {
  code: string;
  riders: number;
  total: number;
  isFull: boolean;
}

export function useConvoyBrowser() {
  const [convoys, setConvoys] = useState<ActiveConvoy[]>([]);
  const [found, setFound] = useState<ConvoySearchHit | null>(null);
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { phone?: string; idToken?: string | null }) => {
      setIsLoading(true);
      setError(null);
      try {
        const resposta = await fetch(CONVOYS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: options?.phone,
            idToken: options?.idToken ?? undefined,
          }),
        });
        if (!resposta.ok) throw new Error(`servidor respondeu ${resposta.status}`);
        const dados = await resposta.json();
        setConvoys(dados.convoys);
        setFound(dados.found);
        setSearched(dados.searched);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { convoys, found, searched, isLoading, error, refresh };
}
