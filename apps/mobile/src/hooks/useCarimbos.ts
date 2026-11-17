import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  avaliarCarimbo, explicarRecusa, ultimoCarimboPorMonumento,
  type CarimboPessoal, type MonumentoRotaBiker,
} from '@motorede/shared';
import { apagarFoto, gravarCarimbos, guardarFoto, lerCarimbos, posicaoAtual, tirarFoto } from '../services/carimbos';

/**
 * Carimbos pessoais da Rota Biker: carregar, carimbar (GPS de agora + foto)
 * e apagar. A ordem do fluxo importa: a posição é conferida ANTES da foto,
 * para ninguém tirar foto e só então descobrir que está longe.
 */
export function useCarimbos() {
  const [carimbos, setCarimbos] = useState<CarimboPessoal[]>([]);
  const [ocupado, setOcupado] = useState<number | null>(null);

  useEffect(() => {
    void lerCarimbos().then(setCarimbos);
  }, []);

  const salvar = useCallback((mudar: (atual: CarimboPessoal[]) => CarimboPessoal[]) => {
    setCarimbos((atual) => {
      const nova = mudar(atual);
      void gravarCarimbos(nova);
      return nova;
    });
  }, []);

  const carimbar = useCallback(async (m: MonumentoRotaBiker) => {
    setOcupado(m.numero);
    try {
      const pos = await posicaoAtual();
      const avaliacao = avaliarCarimbo(m, pos, pos.precisaoM);
      if (!avaliacao.pode) {
        Alert.alert('Ainda não dá para carimbar', explicarRecusa(avaliacao, m));
        return;
      }
      const foto = await tirarFoto();
      if (!foto.ok) {
        if (foto.motivo === 'antiga') Alert.alert('Foto de outro momento', foto.mensagem);
        return;
      }
      const uri = await guardarFoto(foto.uri, m.numero);
      const novo: CarimboPessoal = {
        id: `carimbo-${m.numero}-${Date.now()}`,
        monumento: m.numero,
        em: new Date().toISOString(),
        lat: pos.lat,
        lng: pos.lng,
        precisaoM: pos.precisaoM,
        distanciaKm: avaliacao.distanciaKm,
        foto: uri,
      };
      salvar((atual) => [novo, ...atual]);
      Alert.alert('Carimbado!', `${m.nome} ficou registrado nos seus carimbos, com a foto e o local de agora.`);
    } catch (e) {
      Alert.alert(
        'Não foi possível carimbar',
        e instanceof Error && e.message.startsWith('Permita') ? e.message : 'Confira o GPS e tente de novo.'
      );
    } finally {
      setOcupado(null);
    }
  }, [salvar]);

  const apagar = useCallback((c: CarimboPessoal) => {
    apagarFoto(c.foto);
    salvar((atual) => atual.filter((x) => x.id !== c.id));
  }, [salvar]);

  const ultimos = useMemo(() => ultimoCarimboPorMonumento(carimbos), [carimbos]);

  return { carimbos, ultimos, ocupado, carimbar, apagar };
}
