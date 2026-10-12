import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAVE_ROTAS_SALVAS, alternarRotaSalva, lerRotasSalvas } from '@motorede/shared';

export function useRotasSalvas() {
  const [ids, setIds] = useState<string[]>([]);
  const [pronto, setPronto] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState('');
  const trava = useRef(false);
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
    let cancelado = false;
    AsyncStorage.getItem(CHAVE_ROTAS_SALVAS).then((raw) => {
      const salvos = lerRotasSalvas(raw);
      if (!cancelado) { setIds(salvos); setPronto(true); }
    }).catch(() => {
      if (!cancelado) setErro('Não foi possível carregar suas rotas salvas. Tente reabrir esta tela.');
    });
    return () => { cancelado = true; montado.current = false; };
  }, []);

  const alternar = async (id: string) => {
    if (!pronto || trava.current) return;
    trava.current = true;
    setGravando(true);
    setErro('');
    try {
      const novos = alternarRotaSalva(ids, id);
      await AsyncStorage.setItem(CHAVE_ROTAS_SALVAS, JSON.stringify(novos));
      if (montado.current) setIds(novos);
    } catch {
      if (montado.current) setErro('Não foi possível salvar a alteração neste aparelho. Tente novamente.');
    } finally {
      trava.current = false;
      if (montado.current) setGravando(false);
    }
  };
  return { ids, pronto, gravando, erro, alternar };
}
