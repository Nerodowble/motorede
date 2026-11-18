import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  CAMINHO_PEDAGIOS_SP, autonomiaKm, custoViagem, lerNumeroRota, lerResultadosPhoton, linkGoogleMapsViagem,
  oleoNaViagem, pedagiosNoTrajeto, resumirPedagios, urlBuscaLugar,
  type GeoPoint, type LugarEncontrado, type Motorcycle, type PracaPedagio, type RotaViagem, type TabelaPedagios,
} from '@motorede/shared';
import { API_BASE, WEB_APP_URL } from '../config';

/**
 * Planejar viagem no app (regras em packages/shared/src/domain/planoViagem.ts).
 * A rota e os postos vêm de /api/viagem; os pedágios, da tabela servida pela
 * web. O preço do litro fica guardado: muda pouco entre uma viagem e outra.
 */
const CHAVE_PRECO = 'motorede_preco_litro';
let tabelaPedagios: PracaPedagio[] | null = null;

async function carregarPedagios(): Promise<PracaPedagio[]> {
  if (tabelaPedagios) return tabelaPedagios;
  const r = await fetch(`${WEB_APP_URL}${CAMINHO_PEDAGIOS_SP}`);
  if (!r.ok) throw new Error('pedagios');
  tabelaPedagios = ((await r.json()) as TabelaPedagios).pracas;
  return tabelaPedagios;
}

/**
 * Sugestões de destino: Photon direto do aparelho e, se ele não responder em
 * 5 s, a reserva /api/lugares (openrouteservice). Ver apps/web/api/lugares.ts.
 */
async function buscarLugares(urlPhoton: string, texto: string, perto: GeoPoint | null): Promise<LugarEncontrado[]> {
  try {
    // Tempo-limite à mão: AbortSignal.timeout não existe no React Native nem
    // em Safari antigo.
    const controle = new AbortController();
    const t = setTimeout(() => controle.abort(), 5000);
    try {
      const r = await fetch(urlPhoton, { signal: controle.signal });
      if (r.ok) return lerResultadosPhoton(await r.json());
    } finally {
      clearTimeout(t);
    }
  } catch {
    // fora do ar ou bloqueado: segue para a reserva
  }
  const qs = new URLSearchParams({ q: texto });
  if (perto) { qs.set('lat', String(perto.lat)); qs.set('lng', String(perto.lng)); }
  const r = await fetch(`${`${API_BASE}/lugares`}?${qs}`);
  return r.ok ? ((await r.json()) as { lugares: LugarEncontrado[] }).lugares : [];
}

export function usePlanoViagem(moto: Motorcycle | null, proximaTrocaOleoKm: number | null) {
  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<LugarEncontrado[]>([]);
  const [destino, setDestino] = useState<LugarEncontrado | null>(null);
  const [origem, setOrigem] = useState<GeoPoint | null>(null);
  const [preco, setPrecoTexto] = useState('');
  const [consumo, setConsumo] = useState(() => moto?.avgConsumptionKmL?.toString().replace('.', ',') ?? '');
  const [tanque, setTanque] = useState(() => moto?.tankCapacityLiters?.toString().replace('.', ',') ?? '');
  const [idaVolta, setIdaVolta] = useState(false);
  const [rota, setRota] = useState<RotaViagem | null>(null);
  const [pracas, setPracas] = useState<PracaPedagio[] | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState('');
  const ultimaBusca = useRef(0);

  useEffect(() => { void AsyncStorage.getItem(CHAVE_PRECO).then((v) => { if (v) setPrecoTexto(v); }); }, []);
  const setPreco = useCallback((v: string) => { setPrecoTexto(v); void AsyncStorage.setItem(CHAVE_PRECO, v); }, []);

  // Sugestões enquanto digita, com uma pausa para não consultar a cada letra.
  useEffect(() => {
    if (destino && busca === `${destino.nome}${destino.detalhe ? ` · ${destino.detalhe}` : ''}`) return;
    const perto = origem;
    const url = urlBuscaLugar(busca, perto);
    if (!url) { setSugestoes([]); return; }
    const id = ++ultimaBusca.current;
    const t = setTimeout(() => {
      buscarLugares(url, busca, perto).then((l) => { if (id === ultimaBusca.current) setSugestoes(l); })
        .catch(() => { if (id === ultimaBusca.current) setSugestoes([]); });
    }, 400);
    return () => clearTimeout(t);
  }, [busca, origem, destino]);

  const escolher = useCallback((l: LugarEncontrado) => {
    setDestino(l); setSugestoes([]); setRota(null); setErro('');
    setBusca(`${l.nome}${l.detalhe ? ` · ${l.detalhe}` : ''}`);
  }, []);

  const consumoNum = lerNumeroRota(consumo);
  const tanqueNum = lerNumeroRota(tanque);
  const precoNum = lerNumeroRota(preco);
  const autonomia = autonomiaKm(tanqueNum, consumoNum);

  const calcular = useCallback(async () => {
    if (!destino) { setErro('Escolha o destino na lista de sugestões.'); return; }
    setCalculando(true); setErro(''); setRota(null);
    try {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (permissao.status !== 'granted') throw new Error('Permita a localização: a viagem sai de onde você está.');
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const de = { lat: p.coords.latitude, lng: p.coords.longitude };
      setOrigem(de);
      const [resposta, tabela] = await Promise.all([
        fetch(`${API_BASE}/viagem`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origem: de, destino, autonomiaKm: autonomia }),
        }),
        carregarPedagios().catch(() => null),
      ]);
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error((corpo as { error?: string }).error || 'Não foi possível calcular a viagem agora.');
      setRota(corpo as RotaViagem);
      setPracas(tabela);
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : 'Não foi possível calcular a viagem agora. Confira a internet.');
    } finally {
      setCalculando(false);
    }
  }, [destino, autonomia]);

  const resultado = useMemo(() => {
    if (!rota || !origem || !destino) return null;
    const pedagios = pracas ? pedagiosNoTrajeto(rota.geometria, pracas) : null;
    const resumo = pedagios ? resumirPedagios(pedagios) : null;
    return {
      rota, pedagios, resumo, tabelaCarregada: pracas !== null,
      custo: custoViagem(rota.distanciaKm, consumoNum, precoNum, resumo?.totalMoto ?? 0, idaVolta),
      oleo: moto ? oleoNaViagem(moto.currentKm, proximaTrocaOleoKm, rota.distanciaKm * (idaVolta ? 2 : 1)) : null,
      link: linkGoogleMapsViagem(origem, destino, rota.paradas.map((p) => p.posto ?? p.ponto)),
    };
  }, [rota, pracas, origem, destino, consumoNum, precoNum, idaVolta, moto, proximaTrocaOleoKm]);

  return {
    busca, setBusca, sugestoes, escolher, destino,
    preco, setPreco, consumo, setConsumo, tanque, setTanque, idaVolta, setIdaVolta,
    autonomia, calcular, calculando, erro, resultado,
  };
}
