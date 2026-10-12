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
 *
 * O intervalo que o piloto INFORMA vence o medido: ele é quem sabe de quanto
 * em quanto quer trocar. O medido só entra quando ele não informou nada.
 */

/** A partir de quantos registros o intervalo observado vence o declarado. */
const MEASURED_MIN_RECORDS = 3;

/**
 * Intervalos típicos, usados só enquanto o piloto não informou o dele.
 *
 * Exibidos sempre identificados como padrão — a diferença entre "observei isso
 * em você" e "isso é o número do manual" importa para o piloto confiar no que
 * o app diz.
 *
 * Óleo NÃO tem padrão: varia demais entre motos e pilotos (muita gente troca
 * de 1.000 em 1.000 km), e um número genérico como 5.000 km deixava o piloto
 * achar que estava em dia quando já tinha passado do ponto. Sem o intervalo
 * informado, o cartão do óleo pede o número em vez de inventar.
 */
const DEFAULT_INTERVALS: Partial<Record<ConsumableCategory, number>> = {
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

  /** Intervalo observado nos registros (3+), mesmo quando o informado vence. */
  measuredIntervalKm?: number;

  /** Quilômetros rodados desde a última troca. */
  kmSinceLast?: number;

  /** Quilômetros até a próxima. Negativo significa vencido. */
  kmRemaining?: number;

  /**
   * Data estimada da próxima troca. Só existe quando há ritmo medido — sem
   * saber quanto o piloto roda por mês, prever data seria chute.
   */
  estimatedDate?: string;

  /**
   * `sem-intervalo`: há registro, mas o piloto não informou de quanto em
   * quanto troca e não existe padrão (óleo). Mostra só o que já rodou.
   */
  status: 'sem-registro' | 'sem-intervalo' | 'ok' | 'proximo' | 'vencido';
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

    const medido = measureInterval(daCategoria);
    const declarado = motorcycle.customIntervals?.[category];
    const padrao = DEFAULT_INTERVALS[category];

    // O que o piloto informou manda; o medido só preenche quando ele não disse.
    let intervalKm: number | undefined;
    let intervalSource: IntervalSource | undefined;

    if (declarado && declarado > 0) {
      intervalKm = declarado;
      intervalSource = 'declarado';
    } else if (medido !== null) {
      intervalKm = medido;
      intervalSource = 'medido';
    } else if (padrao) {
      intervalKm = padrao;
      intervalSource = 'padrao';
    }

    if (daCategoria.length === 0) {
      return {
        category,
        label,
        recordCount: 0,
        intervalKm,
        intervalSource,
        status: 'sem-registro' as const,
      };
    }

    const maisRecente = [...daCategoria].sort((a, b) => b.km - a.km)[0];
    const kmSinceLast = Math.max(0, currentKm - maisRecente.km);
    const last = {
      km: maisRecente.km,
      date: maisRecente.date,
      product: maisRecente.product,
    };

    if (intervalKm === undefined) {
      return {
        category,
        label,
        recordCount: daCategoria.length,
        last,
        kmSinceLast,
        status: 'sem-intervalo' as const,
      };
    }

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
      last,
      intervalKm,
      intervalSource,
      measuredIntervalKm: medido ?? undefined,
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
      return `Você troca a cada ${km} km`;
    case 'padrao':
      return `Recomendação típica: ${km} km`;
  }
}

/**
 * Ordena por urgência: vencido, se aproximando, em dia, sem registro.
 *
 * A ordem fixa por categoria fazia um item vencido aparecer em sexto lugar,
 * abaixo de coisas em dia — o piloto rolava a tela para descobrir o que já
 * estava atrasado.
 */
const STATUS_ORDER: Record<MaintenanceItemStatus['status'], number> = {
  vencido: 0,
  proximo: 1,
  'sem-intervalo': 2,
  ok: 3,
  'sem-registro': 4,
};

export function sortByUrgency(items: MaintenanceItemStatus[]): MaintenanceItemStatus[] {
  return [...items].sort((a, b) => {
    const porStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (porStatus !== 0) return porStatus;
    // Dentro do mesmo status, o que vence antes vem primeiro.
    return (a.kmRemaining ?? Infinity) - (b.kmRemaining ?? Infinity);
  });
}
