import type { ConsumableCategory, MaintenanceRecord, Motorcycle } from '../types.js';

/**
 * Manutenção derivada do histórico, não de ficha preenchida à mão.
 *
 * O modelo mental é a etiqueta que a oficina cola no vidro: registra-se o que
 * foi feito, com qual produto e em que quilometragem. Nada mais. É um hábito
 * que já existe, e por isso tem chance de ser mantido.
 *
 * A versão anterior pedia o contrário: que o piloto mantivesse intervalos e
 * datas de seis consumíveis sempre atualizados. Ninguém faz isso — e a prova
 * é que o protótipo precisou preencher tudo com valores fictícios, já que não
 * havia de onde tirar valores reais.
 *
 * Com eventos, cada registro aumenta o que dá para afirmar:
 *   1 registro  → lembrete: o que foi trocado, quando e com qual produto
 *   2 registros → primeiro intervalo observado
 *   3+          → o intervalo REAL do piloto e o ritmo em km por mês
 */

/** A partir de quantos registros o intervalo observado vence o declarado. */
const MEASURED_MIN_RECORDS = 3;

/**
 * Intervalos típicos, usados só enquanto não há histórico.
 *
 * Exibidos sempre identificados como padrão — a diferença entre "observei isso
 * em você" e "isso é o número do manual" importa para o piloto confiar no que
 * o app diz.
 */
const DEFAULT_INTERVALS: Record<ConsumableCategory, number> = {
  engine_oil: 5000,
  transmission_chain: 25000,
  tires: 15000,
  brakes: 12000,
  air_filter_spark_plug: 12000,
  battery: 40000,
};

export const MAINTENANCE_LABELS: Record<ConsumableCategory, string> = {
  engine_oil: 'Óleo do motor',
  transmission_chain: 'Kit de transmissão',
  tires: 'Pneus',
  brakes: 'Pastilhas de freio',
  air_filter_spark_plug: 'Filtro de ar e velas',
  battery: 'Bateria',
};

export const MAINTENANCE_CATEGORIES = Object.keys(
  MAINTENANCE_LABELS
) as ConsumableCategory[];

/** De onde veio o intervalo usado no cálculo. */
export type IntervalSource = 'medido' | 'declarado' | 'padrao';

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

  /** Intervalo adotado e sua origem. Ausente quando não há base nenhuma. */
  intervalKm?: number;
  intervalSource?: IntervalSource;

  /** Quilômetros rodados desde a última troca. */
  kmSinceLast?: number;

  /** Quilômetros até a próxima. Negativo significa vencido. */
  kmRemaining?: number;

  /**
   * Data estimada da próxima troca. Só existe quando há ritmo medido — sem
   * saber quanto o piloto roda por mês, prever data seria chute.
   */
  estimatedDate?: string;

  status: 'sem-registro' | 'ok' | 'proximo' | 'vencido';
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
 * Situação de cada item de manutenção, a partir do histórico.
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

    if (daCategoria.length === 0) {
      return { category, label, recordCount: 0, status: 'sem-registro' as const };
    }

    const maisRecente = [...daCategoria].sort((a, b) => b.km - a.km)[0];

    const medido = measureInterval(daCategoria);
    const declarado = motorcycle.customIntervals?.[category];

    // O hábito real vence a intenção: com histórico suficiente, o medido manda.
    let intervalKm: number;
    let intervalSource: IntervalSource;

    if (medido !== null) {
      intervalKm = medido;
      intervalSource = 'medido';
    } else if (declarado) {
      intervalKm = declarado;
      intervalSource = 'declarado';
    } else {
      intervalKm = DEFAULT_INTERVALS[category];
      intervalSource = 'padrao';
    }

    const kmSinceLast = Math.max(0, currentKm - maisRecente.km);
    const kmRemaining = intervalKm - kmSinceLast;

    let estimatedDate: string | undefined;
    if (kmPorMes && kmPorMes > 0 && kmRemaining > 0) {
      const dias = (kmRemaining / kmPorMes) * 30;
      const data = new Date();
      data.setDate(data.getDate() + Math.round(dias));
      estimatedDate = data.toISOString();
    }

    let status: MaintenanceItemStatus['status'] = 'ok';
    if (kmRemaining <= 0) status = 'vencido';
    else if (kmRemaining <= intervalKm * 0.15) status = 'proximo';

    return {
      category,
      label,
      recordCount: daCategoria.length,
      last: {
        km: maisRecente.km,
        date: maisRecente.date,
        product: maisRecente.product,
      },
      intervalKm,
      intervalSource,
      kmSinceLast,
      kmRemaining,
      estimatedDate,
      status,
    };
  });
}

/** Texto curto explicando de onde veio o intervalo. Para exibir ao piloto. */
export function describeIntervalSource(
  source: IntervalSource,
  intervalKm: number,
  recordCount: number
): string {
  const km = intervalKm.toLocaleString('pt-BR');
  switch (source) {
    case 'medido':
      return `Você troca a cada ~${km} km (${recordCount} registros)`;
    case 'declarado':
      return `Você definiu ${km} km`;
    case 'padrao':
      return `Recomendação típica: ${km} km`;
  }
}
