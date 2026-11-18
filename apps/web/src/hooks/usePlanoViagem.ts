import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CAMINHO_PEDAGIOS_SP, autonomiaKm, custoViagem, lerNumeroRota, lerResultadosPhoton, linkGoogleMapsViagem,
  oleoNaViagem, pedagiosNoTrajeto, resumirPedagios, urlBuscaLugar,
  type GeoPoint, type LugarEncontrado, type Motorcycle, type PracaPedagio, type RotaViagem, type TabelaPedagios,
} from '@motorede/shared';

/**
 * Planejar viagem na web (regras em packages/shared/src/domain/planoViagem.ts;
 * o mesmo fluxo do app em apps/mobile/src/hooks/usePlanoViagem.ts).
 */
const CHAVE_PRECO = 'motorede_preco_litro';
let tabelaPedagios: PracaPedagio[] | null = null;

async function carregarPedagios(): Promise<PracaPedagio[]> {
  if (tabelaPedagios) return tabelaPedagios;
  const r = await fetch(CAMINHO_PEDAGIOS_SP);
  if (!r.ok) throw new Error('pedagios');
  tabelaPedagios = ((await r.json()) as TabelaPedagios).pracas;
  return tabelaPedagios;
}

function posicaoAgora(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Este navegador não informa a localização.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === 1 ? 'Permita a localização para este site: a viagem sai de onde você está.' : 'Não foi possível obter sua posição. Confira o GPS.')),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 }
    );
  });
}

const lerSalvo = (chave: string) => { try { return localStorage.getItem(chave) ?? ''; } catch { return ''; } };
const textoDe = (n: number | undefined) => n?.toString().replace('.', ',') ?? '';

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
  const r = await fetch(`${'/api/lugares'}?${qs}`);
  return r.ok ? ((await r.json()) as { lugares: LugarEncontrado[] }).lugares : [];
}

export function usePlanoViagem(moto: Motorcycle | null, proximaTrocaOleoKm: number | null, origemConhecida: GeoPoint | null) {
  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<LugarEncontrado[]>([]);
  const [destino, setDestino] = useState<LugarEncontrado | null>(null);
  const [origem, setOrigem] = useState<GeoPoint | null>(null);
  const [preco, setPrecoTexto] = useState(() => lerSalvo(CHAVE_PRECO));
  const [consumo, setConsumo] = useState(() => textoDe(moto?.avgConsumptionKmL));
  const [tanque, setTanque] = useState(() => textoDe(moto?.tankCapacityLiters));
  const [idaVolta, setIdaVolta] = useState(false);
  const [rota, setRota] = useState<RotaViagem | null>(null);
  const [pracas, setPracas] = useState<PracaPedagio[] | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState('');
  const ultimaBusca = useRef(0);

  const setPreco = useCallback((v: string) => {
    setPrecoTexto(v);
    try { localStorage.setItem(CHAVE_PRECO, v); } catch { /* sem armazenamento: só não lembra */ }
  }, []);

  useEffect(() => {
    if (destino && busca === `${destino.nome}${destino.detalhe ? ` · ${destino.detalhe}` : ''}`) return;
    const perto = origem ?? origemConhecida;
    const url = urlBuscaLugar(busca, perto);
    if (!url) { setSugestoes([]); return; }
    const id = ++ultimaBusca.current;
    const t = setTimeout(() => {
      buscarLugares(url, busca, perto).then((l) => { if (id === ultimaBusca.current) setSugestoes(l); })
        .catch(() => { if (id === ultimaBusca.current) setSugestoes([]); });
    }, 400);
    return () => clearTimeout(t);
  }, [busca, origem, origemConhecida, destino]);

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
      const de = await posicaoAgora();
      setOrigem(de);
      const [resposta, tabela] = await Promise.all([
        fetch('/api/viagem', {
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
      rota, pedagios, resumo,
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
