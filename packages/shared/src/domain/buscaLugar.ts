import type { GeoPoint } from './sos.js';

/**
 * Busca de destino para o planejamento de viagem: Photon (komoot), feito sobre
 * o OpenStreetMap, gratuito e sem conta, pensado para sugerir enquanto se
 * digita. O app e a web chamam direto (o Photon libera CORS).
 */

export interface LugarEncontrado extends GeoPoint {
  nome: string;
  /** "Foz do Iguaçu, PR" — o que distingue lugares de mesmo nome. */
  detalhe: string;
}

/** Só busca a partir de 3 letras; abaixo disso a sugestão é ruído. */
export const MINIMO_LETRAS_BUSCA = 3;

const SIGLAS_UF: Record<string, string> = {
  Acre: 'AC', Alagoas: 'AL', Amapá: 'AP', Amazonas: 'AM', Bahia: 'BA', Ceará: 'CE', 'Distrito Federal': 'DF',
  'Espírito Santo': 'ES', Goiás: 'GO', Maranhão: 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', Pará: 'PA', Paraíba: 'PB', Paraná: 'PR', Pernambuco: 'PE', Piauí: 'PI',
  'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', Rondônia: 'RO', Roraima: 'RR',
  'Santa Catarina': 'SC', 'São Paulo': 'SP', Sergipe: 'SE', Tocantins: 'TO',
};

/** URL da busca, puxando resultados para perto do piloto quando a posição é conhecida. */
export function urlBuscaLugar(texto: string, perto?: GeoPoint | null): string | null {
  const q = texto.trim();
  if (q.length < MINIMO_LETRAS_BUSCA) return null;
  const qs = new URLSearchParams({ q, limit: '8' });
  // Viés fraco de propósito: com o viés padrão, "Foz do Iguaçu" digitado em
  // São Paulo trazia só a "Rua Foz do Iguaçu" do bairro, e nunca a cidade.
  if (perto) {
    qs.set('lat', perto.lat.toFixed(3)); qs.set('lon', perto.lng.toFixed(3));
    qs.set('zoom', '4'); qs.set('location_bias_scale', '0.1');
  }
  return `https://photon.komoot.io/api/?${qs.toString()}`;
}

interface FeaturePhoton {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; city?: string; state?: string; country?: string; countrycode?: string; osm_key?: string };
}

interface FeatureOrs {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; locality?: string; region?: string; region_a?: string; country?: string; country_a?: string; layer?: string };
}

/**
 * Lê a resposta da busca de endereços do openrouteservice (reserva de
 * /api/lugares), no mesmo formato e com a mesma ordem do Photon.
 */
export function lerResultadosOrsGeocode(json: unknown): LugarEncontrado[] {
  const features = ((json as { features?: FeatureOrs[] })?.features ?? []);
  const vistos = new Set<string>();
  const lugares: (LugarEncontrado & { peso: number })[] = [];
  for (const f of features) {
    const c = f.geometry?.coordinates;
    const p = f.properties ?? {};
    if (!c || !p.name) continue;
    const br = p.country_a === 'BRA';
    const uf = br ? p.region_a ?? (p.region ? SIGLAS_UF[p.region] ?? p.region : '') : p.region ?? '';
    const detalhe = [p.locality && p.locality !== p.name ? p.locality : '', uf, br ? '' : p.country ?? ''].filter(Boolean).join(', ');
    const chave = `${p.name}|${detalhe}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const cidade = p.layer === 'locality' || p.layer === 'localadmin' || p.layer === 'county';
    lugares.push({ nome: p.name, detalhe, lng: c[0], lat: c[1], peso: (br ? 2 : 0) + (cidade ? 1 : 0) });
  }
  return lugares.sort((a, b) => b.peso - a.peso).slice(0, 6).map(({ peso: _peso, ...l }) => l);
}

/** Lê a resposta do Photon: Brasil primeiro, cidades antes de ruas e lojas, sem repetidos. */
export function lerResultadosPhoton(json: unknown): LugarEncontrado[] {
  const features = ((json as { features?: FeaturePhoton[] })?.features ?? []);
  const vistos = new Set<string>();
  const lugares: (LugarEncontrado & { peso: number })[] = [];
  for (const f of features) {
    const c = f.geometry?.coordinates;
    const p = f.properties ?? {};
    if (!c || !p.name) continue;
    const uf = p.state ? SIGLAS_UF[p.state] ?? p.state : '';
    const partes = [p.city && p.city !== p.name ? p.city : '', uf, p.countrycode && p.countrycode !== 'BR' ? p.country ?? '' : '']
      .filter(Boolean);
    const detalhe = partes.join(', ');
    const chave = `${p.name}|${detalhe}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const peso = (p.countrycode === 'BR' ? 2 : 0) + (p.osm_key === 'place' ? 1 : 0);
    lugares.push({ nome: p.name, detalhe, lng: c[0], lat: c[1], peso });
  }
  // sort estável: dentro do mesmo peso, mantém a ordem de relevância do Photon.
  return lugares.sort((a, b) => b.peso - a.peso).slice(0, 6).map(({ peso: _peso, ...l }) => l);
}
