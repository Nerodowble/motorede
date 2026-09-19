import type { ConsumableCategory, ConsumableStatus, Motorcycle } from '../types.js';

/**
 * Ajuste manual do piloto para um consumível específico.
 * No protótipo isso vinha do localStorage; agora entra como parâmetro
 * para que a função continue pura e rode igual no app, na web e no servidor.
 */
export interface ConsumableOverride {
  intervalKm?: number;
  lastChangedKm?: number;
  lastChangedDate?: string;
}

export type ConsumableOverrides = Partial<Record<ConsumableCategory, ConsumableOverride>>;

/** Multiplicador de desgaste conforme o estilo de pilotagem declarado. */
const WEAR_MULTIPLIER: Record<NonNullable<Motorcycle['ridingStyle']>, number> = {
  aggressive: 1.25,
  commuter_heavy: 1.15,
  mixed: 1.0,
  calm: 0.9,
};

interface ConsumableBaseline {
  category: ConsumableCategory;
  name: string;
  defaultIntervalKm: number;
  intervalMonths: number;
  /**
   * Quantos km atrás a troca ocorreu, quando não há histórico registrado.
   * `null` = nunca trocado, o desgaste conta desde 0 km.
   */
  kmSinceLastChange: number | null;
  lastChangedDate: string;
}

const BASELINES: ConsumableBaseline[] = [
  {
    category: 'engine_oil',
    name: 'Óleo do Motor & Filtro',
    defaultIntervalKm: 5000,
    intervalMonths: 6,
    kmSinceLastChange: 850,
    lastChangedDate: '2026-07-10',
  },
  {
    category: 'transmission_chain',
    name: 'Kit Transmissão (Relação)',
    defaultIntervalKm: 25000,
    intervalMonths: 24,
    kmSinceLastChange: 24000,
    lastChangedDate: '2024-01-10',
  },
  {
    category: 'brakes',
    name: 'Pastilhas de Freio (Diant/Tras)',
    defaultIntervalKm: 12000,
    intervalMonths: 18,
    kmSinceLastChange: 3350,
    lastChangedDate: '2026-05-18',
  },
  {
    category: 'tires',
    name: 'Pneus (Dianteiro & Traseiro)',
    defaultIntervalKm: 15000,
    intervalMonths: 36,
    kmSinceLastChange: 10650,
    lastChangedDate: '2025-10-05',
  },
  {
    category: 'air_filter_spark_plug',
    name: 'Filtro de Ar & Velas de Ignição',
    defaultIntervalKm: 12000,
    intervalMonths: 18,
    kmSinceLastChange: 10650,
    lastChangedDate: '2025-10-05',
  },
  {
    category: 'battery',
    name: 'Bateria 12V e Sistema de Carga',
    defaultIntervalKm: 40000,
    intervalMonths: 30,
    kmSinceLastChange: null, // sem troca registrada
    lastChangedDate: '2024-01-10',
  },
];

/**
 * Calcula o desgaste estimado de cada consumível da moto.
 *
 * Função pura: mesma entrada, mesma saída, sem tocar em localStorage,
 * rede ou DOM. Os ajustes do piloto entram por `overrides`.
 */
export function calculateConsumablesStatus(
  motorcycle: Motorcycle,
  overrides: ConsumableOverrides = {}
): ConsumableStatus[] {
  const currentKm = motorcycle.currentKm;
  const wearMultiplier = motorcycle.ridingStyle ? WEAR_MULTIPLIER[motorcycle.ridingStyle] : 1.0;

  return BASELINES.map((baseline) => {
    const override = overrides[baseline.category];

    const intervalKm =
      override?.intervalKm ??
      motorcycle.customIntervals?.[baseline.category] ??
      baseline.defaultIntervalKm;

    const lastChangedKm =
      override?.lastChangedKm ??
      (baseline.kmSinceLastChange === null
        ? 0
        : Math.max(0, currentKm - baseline.kmSinceLastChange));

    const lastChangedDate = override?.lastChangedDate ?? baseline.lastChangedDate;

    const kmSinceChange = Math.max(0, currentKm - lastChangedKm);
    const adjustedWear = kmSinceChange * wearMultiplier;
    const wearRatio = Math.min(1.2, adjustedWear / intervalKm);
    const currentWearPercentage = Math.min(100, Math.round(wearRatio * 100));
    const estimatedRemainingKm = Math.max(0, Math.round(intervalKm - adjustedWear));

    // Dias restantes projetados pela média mensal real do piloto.
    const avgMonthly = motorcycle.avgKmPerMonth > 0 ? motorcycle.avgKmPerMonth : 1000;
    const estimatedRemainingDays = Math.max(
      0,
      Math.round(estimatedRemainingKm / (avgMonthly / 30))
    );

    let status: ConsumableStatus['status'] = 'optimal';
    if (currentWearPercentage >= 90 || estimatedRemainingKm <= 500) {
      status = 'critical';
    } else if (currentWearPercentage >= 75 || estimatedRemainingKm <= 1500) {
      status = 'warning';
    }

    return {
      id: `cons-${baseline.category}`,
      category: baseline.category,
      name: baseline.name,
      intervalKm,
      intervalMonths: baseline.intervalMonths,
      lastChangedKm,
      lastChangedDate,
      currentWearPercentage,
      estimatedRemainingKm,
      estimatedRemainingDays,
      status,
    };
  });
}
