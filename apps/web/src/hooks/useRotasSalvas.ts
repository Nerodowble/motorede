import { useEffect, useState } from 'react';
import { CHAVE_ROTAS_SALVAS, alternarRotaSalva, lerRotasSalvas } from '@motorede/shared';

export function useRotasSalvas() {
  const [ids, setIds] = useState<string[]>([]);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState('');
  useEffect(() => {
    const carregar = () => {
      try { setIds(lerRotasSalvas(localStorage.getItem(CHAVE_ROTAS_SALVAS))); setPronto(true); setErro(''); }
      catch { setPronto(false); setErro('Não foi possível carregar suas rotas salvas neste navegador.'); }
    };
    const atualizar = (e: StorageEvent) => { if (e.key === CHAVE_ROTAS_SALVAS || e.key === null) carregar(); };
    carregar();
    window.addEventListener('storage', atualizar);
    return () => window.removeEventListener('storage', atualizar);
  }, []);
  const alternar = (id: string) => {
    if (!pronto) return;
    try {
      const novos = alternarRotaSalva(lerRotasSalvas(localStorage.getItem(CHAVE_ROTAS_SALVAS)), id);
      localStorage.setItem(CHAVE_ROTAS_SALVAS, JSON.stringify(novos));
      setIds(novos); setErro('');
    } catch { setErro('Não foi possível salvar a alteração neste navegador. Tente novamente.'); }
  };
  return { ids, pronto, erro, alternar };
}
