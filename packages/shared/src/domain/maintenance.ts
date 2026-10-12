import type { ConsumableCategory, MaintenanceRecord, Motorcycle } from '../types.js';

/**
 * Manutenção derivada do histórico, não de ficha preenchida à mão.
 *
 * O modelo mental é a etiqueta que a oficina cola no vidro: registra-se o que
 * foi feito, com qual produto e em que quilometragem. Nada mais. É um hábito
 * que já existe, e por isso tem chance de ser mantido.
 *
 * TODO número da tela vem de algo que o piloto digitou — o km atual da moto,
 * o km da troca e de quantos em quantos km ele troca — e as contas são só
 * soma e subtração:
 *
 *   próxima troca = km da última troca + intervalo
 *   rodou         = km atual − km da última troca
 *   faltam        = próxima troca − km atual
 *
 * Não há intervalo padrão nem média que entra sozinha no lugar do informado.
 * Versões anteriores usavam um "padrão típico" (5.000 km no óleo, 15.000 nos
 * pneus) e trocavam o informado pela média medida após 3 registros; o piloto
 * via números que nunca digitou e não sabia de onde vinham. A média medida
 * continua calculada, mas só aparece como dica.
 */

/** A partir de quantos registros a média observada aparece como dica. */
const MEASURED_MIN_RECORDS = 3;

/** Abaixo desta fração do intervalo restante, o item está "se aproximando". */
const FRACAO_PROXIMO = 0.15;

export const MAINTENANCE_LABELS: Record<ConsumableCategory, string> = {
  engine_oil: 'Óleo do motor',
  transmission_chain: 'Kit de transmissão',
  tires: 'Pneus',
  brakes: 'Pastilhas de freio',
  air_filter_spark_plug: 'Filtro de ar e velas',
  battery: 'Bateria',
};

/** Atalhos para o piloto escolher de quanto em quanto troca o óleo. */
export const OIL_INTERVAL_SUGGESTIONS = [1000, 1500, 2000, 3000] as const;

/** Limites aceitos para um intervalo informado. Fora disso é erro de digitação. */
export const INTERVAL_MIN_KM = 100;
export const INTERVAL_MAX_KM = 100000;

/** Lê o intervalo digitado. Volta null quando vazio ou fora dos limites. */
export function parseIntervalKm(texto: string): number | null {
  const n = parseInt(texto.replace(/\D/g, ''), 10);
  if (isNaN(n) || n < INTERVAL_MIN_KM || n > INTERVAL_MAX_KM) return null;
  return n;
}

export const MAINTENANCE_CATEGORIES = Object.keys(
  MAINTENANCE_LABELS
) as ConsumableCategory[];

export interface MaintenanceItemStatus {
  category: ConsumableCategory;
  label: string;

  /** Quantos registros existem dessa categoria. */
  recordCount: number;

  /** O registro mais recente, quando existe. */
  last?: {
    km: number;
    date: string;
    /** Marca e modelo do que foi usado, ex.: "Motul 5100 10W40". */
    product?: string;
  };

  /** De quantos em quantos km o piloto troca. Só existe se ele informou. */
  intervalKm?: number;

  /** Média observada entre as trocas registradas (3+). Só dica, nunca entra na conta. */
  measuredIntervalKm?: number;

  /** Km do odômetro em que a próxima troca deve acontecer. */
  nextChangeKm?: number;

  /** Quilômetros rodados desde a última troca. */
  kmSinceLast?: number;

  /** Quilômetros até a próxima. Zero é hora de trocar; negativo, passou. */
  kmRemaining?: number;

  /**
   * Data estimada da próxima troca. Só existe quando há ritmo medido — sem
   * saber quanto o piloto roda por mês, prever data seria chute.
   */
  estimatedDate?: string;

  /**
   * - `sem-registro`: nenhuma troca registrada.
   * - `sem-intervalo`: há troca, mas o piloto não disse de quanto em quanto
   *   troca. Mostra só quanto rodou.
   * - `hora-de-trocar`: chegou exatamente no km da próxima troca.
   * - `vencido`: passou do km da próxima troca.
   */
  status: 'sem-registro' | 'sem-intervalo' | 'ok' | 'proximo' | 'hora-de-trocar' | 'vencido';
}

/**
 * Ritmo do piloto em km por mês, medido pelos próprios registros.
 *
 * Retorna null com menos de dois registros: com um ponto não há intervalo, e
 * inventar um ritmo faria o app prever datas sem base.
 */
export function measureKmPerMonth(records: MaintenanceRecord[]): number | null {
  if (records.length < 2) return null;

  const ordenados = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];

  const dias =
    (new Date(ultimo.date).getTime() - new Date(primeiro.date).getTime()) /
    (1000 * 60 * 60 * 24);
  const km = ultimo.km - primeiro.km;

  if (dias < 30 || km <= 0) return null;

  return Math.round((km / dias) * 30);
}

/** Média dos intervalos observados entre trocas da mesma categoria. */
function measureInterval(recordsDaCategoria: MaintenanceRecord[]): number | null {
  if (recordsDaCategoria.length < MEASURED_MIN_RECORDS) return null;

  const ordenados = [...recordsDaCategoria].sort((a, b) => a.km - b.km);
  const intervalos: number[] = [];

  for (let i = 1; i < ordenados.length; i++) {
    const diff = ordenados[i].km - ordenados[i - 1].km;
    if (diff > 0) intervalos.push(diff);
  }

  if (intervalos.length === 0) return null;

  return Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length);
}

/**
 * Situação de cada item de manutenção, a partir do histórico e do intervalo
 * que o piloto informou.
 *
 * Categorias sem nenhum registro voltam como `sem-registro`: sem barra, sem
 * porcentagem, sem alerta. Item sem histórico não vira número inventado — a
 * interface deve convidar a registrar, não fingir que sabe.
 */
export function summarizeMaintenance(
  records: MaintenanceRecord[],
  motorcycle: Pick<Motorcycle, 'currentKm' | 'customIntervals'>
): MaintenanceItemStatus[] {
  const kmPorMes = measureKmPerMonth(records);
  const currentKm = motorcycle.currentKm;

  return MAINTENANCE_CATEGORIES.map((category) => {
    const daCategoria = records.filter((r) => r.category === category);
    const label = MAINTENANCE_LABELS[category];
    const informado = motorcycle.customIntervals?.[category];
    const intervalKm = informado && informado > 0 ? informado : undefined;

    if (daCategoria.length === 0) {
      return { category, label, recordCount: 0, intervalKm, status: 'sem-registro' as const };
    }

    const maisRecente = [...daCategoria].sort((a, b) => b.km - a.km)[0];
    const kmSinceLast = Math.max(0, currentKm - maisRecente.km);
    const last = {
      km: maisRecente.km,
      date: maisRecente.date,
      product: maisRecente.product,
    };
    const measuredIntervalKm = measureInterval(daCategoria) ?? undefined;

    if (intervalKm === undefined) {
      return {
        category,
        label,
        recordCount: daCategoria.length,
        last,
        measuredIntervalKm,
        kmSinceLast,
        status: 'sem-intervalo' as const,
      };
    }

    const nextChangeKm = maisRecente.km + intervalKm;
    const kmRemaining = intervalKm - kmSinceLast;

    let estimatedDate: string | undefined;
    if (kmPorMes && kmPorMes > 0 && kmRemaining > 0) {
      const dias = (kmRemaining / kmPorMes) * 30;
      const data = new Date();
      data.setDate(data.getDate() + Math.round(dias));
      estimatedDate = data.toISOString();
    }

    let status: MaintenanceItemStatus['status'] = 'ok';
    if (kmRemaining < 0) status = 'vencido';
    else if (kmRemaining === 0) status = 'hora-de-trocar';
    else if (kmRemaining <= intervalKm * FRACAO_PROXIMO) status = 'proximo';

    return {
      category,
      label,
      recordCount: daCategoria.length,
      last,
      intervalKm,
      measuredIntervalKm,
      nextChangeKm,
      kmSinceLast,
      kmRemaining,
      estimatedDate,
      status,
    };
  });
}

/**
 * Ordena por urgência: vencido, hora de trocar, se aproximando, sem
 * intervalo, em dia, sem registro.
 *
 * A ordem fixa por categoria fazia um item vencido aparecer em sexto lugar,
 * abaixo de coisas em dia — o piloto rolava a tela para descobrir o que já
 * estava atrasado.
 */
const STATUS_ORDER: Record<MaintenanceItemStatus['status'], number> = {
  vencido: 0,
  'hora-de-trocar': 1,
  proximo: 2,
  'sem-intervalo': 3,
  ok: 4,
  'sem-registro': 5,
};

export function sortByUrgency(items: MaintenanceItemStatus[]): MaintenanceItemStatus[] {
  return [...items].sort((a, b) => {
    const porStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (porStatus !== 0) return porStatus;
    // Dentro do mesmo status, o que vence antes vem primeiro.
    return (a.kmRemaining ?? Infinity) - (b.kmRemaining ?? Infinity);
  });
}

const km = (n: number) => `${n.toLocaleString('pt-BR')} km`;

/** "faltam 100 km", "chegou a hora de trocar" ou "passou 200 km". */
export function describeRemaining(kmRemaining: number): string {
  if (kmRemaining > 0) return `faltam ${km(kmRemaining)}`;
  if (kmRemaining === 0) return 'chegou a hora de trocar';
  return `passou ${km(-kmRemaining)}`;
}

/**
 * Dica com a média das trocas registradas, quando ela difere do informado.
 * Nunca entra na conta — o piloto decide se quer usar esse número.
 */
export function describeMeasuredHint(item: MaintenanceItemStatus): string | null {
  const media = item.measuredIntervalKm;
  if (!media || media === item.intervalKm) return null;
  return `Nas suas últimas trocas, a média foi de ${km(media)}.`;
}
