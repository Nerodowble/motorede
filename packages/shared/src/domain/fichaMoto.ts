import type { ConsumableCategory, Motorcycle } from '../types.js';
import { INTERVAL_MAX_KM, INTERVAL_MIN_KM } from './maintenance.js';

/**
 * Ficha técnica da moto pesquisada por IA.
 *
 * Em vez de manter um acervo com milhares de modelos, o MotoRede pergunta a
 * uma IA (o "plugin de IA", que roda no computador de quem opera o servidor
 * — ver docs/plugins.md) e guarda a resposta por modelo. A primeira pessoa
 * com uma CB 500F 2022 dispara a pesquisa; as seguintes recebem do cache.
 *
 * O que se pergunta sai dos campos que o app já usa (`Motorcycle` e as
 * categorias de manutenção). O prompt é montado AQUI, nunca no aparelho: o app
 * manda só marca, modelo e ano, e ninguém usa a IA para outra coisa.
 *
 * A IA erra e sai do ar. Por isso:
 * - cada campo é validado com faixas plausíveis e descartado sozinho se vier
 *   absurdo (tanque de 400 L não derruba a ficha inteira, só some);
 * - o que não se sabe vem null — melhor faltar que inventar;
 * - a interface mostra sempre que é pesquisa por IA, e nada é gravado na moto
 *   sem o piloto tocar em "usar".
 */

/** Categorias com intervalo de troca pesquisado (o óleo vem no bloco próprio). */
export const CATEGORIAS_FICHA = [
  'transmission_chain',
  'tires',
  'brakes',
  'air_filter_spark_plug',
  'battery',
] as const satisfies readonly ConsumableCategory[];

export interface FichaMoto {
  cilindradaCc: number | null;
  combustivel: NonNullable<Motorcycle['fuelType']> | null;
  tanqueLitros: number | null;
  /** Consumo de referência do modelo. O do piloto, medido, vale mais. */
  consumoKmL: number | null;
  oleo: {
    /** Ex.: "10W-30". */
    viscosidade: string | null;
    /** Volume na troca, com filtro se o manual pedir. */
    litros: number | null;
    /** Intervalo do manual. O piloto pode trocar antes. */
    intervaloKm: number | null;
  } | null;
  intervalosKm: Partial<Record<(typeof CATEGORIAS_FICHA)[number], number>>;
  /** Uma frase de ressalva da própria IA, se houver. */
  observacao: string | null;
}

/** O que o app manda: só o que identifica o modelo. */
export interface MotoConsulta {
  marca: string;
  modelo: string;
  ano: number;
}

export const AVISO_FICHA_IA =
  'Pesquisado por IA a partir do modelo da moto. Pode variar ou estar errado: confira no manual antes de usar.';

/** Situação da ficha, como a API responde. */
export type EstadoFicha =
  | { estado: 'pronta'; ficha: FichaMoto; em: number }
  | { estado: 'pendente' }
  | { estado: 'sem-dados' }
  | { estado: 'indisponivel' }
  | { estado: 'falhou' };

const ANO_MINIMO = 1950;

/**
 * Ano/modelo digitado pelo piloto. Volta null quando vazio ou impossível.
 * A ficha é por ano: uma CB 500F 2015 e uma 2022 têm tanque e óleo diferentes.
 */
export function parseAnoMoto(texto: string, anoAtual = new Date().getFullYear()): number | null {
  const n = parseInt(texto.replace(/\D/g, ''), 10);
  if (!Number.isInteger(n) || n < ANO_MINIMO || n > anoAtual + 1) return null;
  return n;
}

/** Valida o que o app mandou. Volta null se não dá para pesquisar. */
export function lerMotoConsulta(raw: unknown, anoAtual = new Date().getFullYear()): MotoConsulta | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
  const marca = texto(m.marca);
  const modelo = texto(m.modelo);
  const ano = typeof m.ano === 'number' ? m.ano : Number(m.ano);
  // Letras (com acento), números e pouca pontuação: é nome de moto, não prompt.
  const nomeValido = (s: string) => s.length >= 1 && s.length <= 40 && /^[\p{L}\d .\-/+]+$/u.test(s);
  if (!nomeValido(marca) || !nomeValido(modelo)) return null;
  if (!Number.isInteger(ano) || ano < ANO_MINIMO || ano > anoAtual + 1) return null;
  return { marca, modelo, ano };
}

/** "Honda", "CB 500F", 2022 → "honda|cb 500f|2022". Mesma moto digitada de jeitos diferentes, mesma ficha. */
export function chaveFichaMoto(moto: MotoConsulta): string {
  const limpar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  return `${limpar(moto.marca)}|${limpar(moto.modelo)}|${moto.ano}`;
}

/** O prompt enviado à IA. Pede só JSON, com null para o que não souber. */
export function montarPromptFichaMoto(moto: MotoConsulta): string {
  return [
    `Ficha técnica da motocicleta ${moto.marca} ${moto.modelo}, ano/modelo ${moto.ano}, versão vendida no Brasil.`,
    'Responda SOMENTE com um objeto JSON, sem texto antes ou depois, neste formato:',
    '{"cilindradaCc": número, "combustivel": "gasoline" | "flex" | "ethanol", "tanqueLitros": número,',
    ' "consumoKmL": número, "oleo": {"viscosidade": "10W-30", "litros": número, "intervaloKm": número},',
    ' "intervalosKm": {"transmission_chain": número, "tires": número, "brakes": número,',
    ' "air_filter_spark_plug": número, "battery": número}, "observacao": "uma frase curta ou null"}',
    'Regras: use os dados do manual do fabricante. consumoKmL é o consumo médio de referência em km/l.',
    'oleo.litros é o volume na troca. intervalosKm são os intervalos de troca do manual em km',
    '(transmission_chain = kit de transmissão, tires = pneus, brakes = pastilhas de freio,',
    'air_filter_spark_plug = filtro de ar e velas, battery = bateria).',
    'Se não tiver certeza de um valor, use null. Não invente.',
  ].join('\n');
}

const numero = (v: unknown, min: number, max: number, casas = 1): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) return null;
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};

const intervalo = (v: unknown) => numero(v, INTERVAL_MIN_KM, INTERVAL_MAX_KM, 0);

/** "10w30", "10W-30" → "10W-30". Outra coisa → null. */
function viscosidade(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().toUpperCase().match(/^(\d{1,2})\s*W\s*-?\s*(\d{2})$/);
  return m ? `${m[1]}W-${m[2]}` : null;
}

/**
 * Lê a resposta da IA. Aceita o JSON cercado de texto ou de ```json (a IA nem
 * sempre obedece "somente JSON"). Volta null se não houver JSON nenhum, e uma
 * ficha com tudo null se a IA não soube nada — `fichaVazia` distingue.
 */
export function lerRespostaFichaMoto(texto: string): FichaMoto | null {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio < 0 || fim <= inicio) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto.slice(inicio, fim + 1));
  } catch {
    return null;
  }
  if (!bruto || typeof bruto !== 'object') return null;
  const r = bruto as Record<string, unknown>;

  const oleoBruto = (r.oleo && typeof r.oleo === 'object' ? r.oleo : {}) as Record<string, unknown>;
  const oleo = {
    viscosidade: viscosidade(oleoBruto.viscosidade),
    litros: numero(oleoBruto.litros, 0.3, 8),
    intervaloKm: intervalo(oleoBruto.intervaloKm),
  };

  const intervalosBrutos = (r.intervalosKm && typeof r.intervalosKm === 'object'
    ? r.intervalosKm
    : {}) as Record<string, unknown>;
  const intervalosKm: FichaMoto['intervalosKm'] = {};
  for (const c of CATEGORIAS_FICHA) {
    const km = intervalo(intervalosBrutos[c]);
    if (km !== null) intervalosKm[c] = km;
  }

  const combustivel =
    r.combustivel === 'gasoline' || r.combustivel === 'flex' || r.combustivel === 'ethanol'
      ? r.combustivel
      : null;
  const observacao =
    typeof r.observacao === 'string' && r.observacao.trim() ? r.observacao.trim().slice(0, 240) : null;

  return {
    cilindradaCc: numero(r.cilindradaCc, 49, 2500, 0),
    combustivel,
    tanqueLitros: numero(r.tanqueLitros, 2, 40),
    consumoKmL: numero(r.consumoKmL, 5, 80),
    oleo: oleo.viscosidade || oleo.litros || oleo.intervaloKm ? oleo : null,
    intervalosKm,
    observacao,
  };
}

/**
 * O que o piloto pode copiar da ficha para a moto dele, com um toque.
 *
 * Consumo NÃO entra: `avgConsumptionKmL` é o consumo REAL do piloto, e trocar
 * pelo de referência seria pôr número de catálogo no lugar de medição — o
 * mesmo erro dos 26,5 km/l fictícios que a ficha já gravou um dia.
 */
export type UsoFicha =
  | { tipo: 'moto'; campo: 'displacementCc' | 'tankCapacityLiters'; valor: number }
  | { tipo: 'moto'; campo: 'fuelType'; valor: NonNullable<Motorcycle['fuelType']> }
  | { tipo: 'intervalo'; categoria: ConsumableCategory; km: number };

export interface LinhaFicha {
  rotulo: string;
  valor: string;
  /** Uma nota curta embaixo do valor. */
  nota?: string;
  /** Ausente quando a moto já tem esse valor. */
  usar?: UsoFicha;
}

const ROTULOS_COMBUSTIVEL: Record<NonNullable<Motorcycle['fuelType']>, string> = {
  gasoline: 'Gasolina',
  flex: 'Flex',
  ethanol: 'Etanol',
};

const ROTULOS_CATEGORIA: Record<(typeof CATEGORIAS_FICHA)[number], string> = {
  transmission_chain: 'Kit de transmissão',
  tires: 'Pneus',
  brakes: 'Pastilhas de freio',
  air_filter_spark_plug: 'Filtro de ar e velas',
  battery: 'Bateria',
};

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** As linhas da ficha, na ordem da tela. Web e app mostram exatamente isto. */
export function linhasFichaMoto(
  ficha: FichaMoto,
  moto: Pick<Motorcycle, 'displacementCc' | 'tankCapacityLiters' | 'fuelType' | 'customIntervals'>
): LinhaFicha[] {
  const linhas: LinhaFicha[] = [];

  if (ficha.cilindradaCc !== null) {
    linhas.push({
      rotulo: 'Cilindrada',
      valor: `${fmt(ficha.cilindradaCc)} cc`,
      usar:
        moto.displacementCc === ficha.cilindradaCc
          ? undefined
          : { tipo: 'moto', campo: 'displacementCc', valor: ficha.cilindradaCc },
    });
  }
  if (ficha.combustivel !== null) {
    linhas.push({
      rotulo: 'Combustível',
      valor: ROTULOS_COMBUSTIVEL[ficha.combustivel],
      usar:
        moto.fuelType === ficha.combustivel
          ? undefined
          : { tipo: 'moto', campo: 'fuelType', valor: ficha.combustivel },
    });
  }
  if (ficha.tanqueLitros !== null) {
    linhas.push({
      rotulo: 'Tanque',
      valor: `${fmt(ficha.tanqueLitros)} L`,
      usar:
        moto.tankCapacityLiters === ficha.tanqueLitros
          ? undefined
          : { tipo: 'moto', campo: 'tankCapacityLiters', valor: ficha.tanqueLitros },
    });
  }
  if (ficha.consumoKmL !== null) {
    linhas.push({
      rotulo: 'Consumo de referência',
      valor: `${fmt(ficha.consumoKmL)} km/l`,
      nota: 'O seu, medido no dia a dia, vale mais.',
    });
  }
  if (ficha.oleo) {
    const partes = [
      ficha.oleo.viscosidade,
      ficha.oleo.litros !== null ? `${fmt(ficha.oleo.litros)} L na troca` : null,
    ].filter(Boolean);
    const km = ficha.oleo.intervaloKm;
    linhas.push({
      rotulo: 'Óleo do motor',
      valor: partes.join(' · ') || '—',
      nota: km !== null ? `Manual: troca a cada ${fmt(km)} km` : undefined,
      usar:
        km === null || moto.customIntervals?.engine_oil === km
          ? undefined
          : { tipo: 'intervalo', categoria: 'engine_oil', km },
    });
  }
  for (const c of CATEGORIAS_FICHA) {
    const km = ficha.intervalosKm[c];
    if (km === undefined) continue;
    linhas.push({
      rotulo: ROTULOS_CATEGORIA[c],
      valor: `a cada ${fmt(km)} km`,
      usar: moto.customIntervals?.[c] === km ? undefined : { tipo: 'intervalo', categoria: c, km },
    });
  }
  return linhas;
}

/** O que o botão "usar" diz. Intervalo vira "usar este intervalo". */
export function rotuloUsoFicha(uso: UsoFicha): string {
  return uso.tipo === 'intervalo' ? 'Usar intervalo' : 'Usar';
}

/** A IA respondeu, mas não soube nada aproveitável. */
export function fichaVazia(f: FichaMoto): boolean {
  return (
    f.cilindradaCc === null &&
    f.combustivel === null &&
    f.tanqueLitros === null &&
    f.consumoKmL === null &&
    f.oleo === null &&
    Object.keys(f.intervalosKm).length === 0
  );
}
