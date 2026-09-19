import { useCallback, useState } from 'react';
import type { ActiveConvoy } from '@motorede/shared';

/**
 * Navegador de comboios: lista os ativos e encontra um piloto pelo telefone.
 *
 * Tudo vem da API de servidor do LiveKit — não há banco por trás. A busca
 * compara impressões digitais calculadas no servidor, então o telefone de
 * ninguém trafega de volta para o navegador.
 */

export interface ConvoySearchHit {
  code: string;
  riders: number;
  total: number;
  isFull: boolean;
}

interface UseConvoyBrowser {
  convoys: ActiveConvoy[];
  found: ConvoySearchHit | null;
  searched: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: (options?: { phone?: string; idToken?: string | null }) => Promise<void>;
  clearSearch: () => void;
}

export function useConvoyBrowser(): UseConvoyBrowser {
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
        const response = await fetch('/api/comboios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: options?.phone,
            idToken: options?.idToken ?? undefined,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `servidor respondeu ${response.status}`);
        }

        const data = (await response.json()) as {
          convoys: ActiveConvoy[];
          found: ConvoySearchHit | null;
          searched: boolean;
        };

        setConvoys(data.convoys);
        setFound(data.found);
        setSearched(data.searched);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearSearch = useCallback(() => {
    setFound(null);
    setSearched(false);
  }, []);

  return { convoys, found, searched, isLoading, error, refresh, clearSearch };
}
