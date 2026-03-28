import { formatCurrency } from "@/lib/utils";

/** Dua tarif base pay (IDR) untuk Submit Targets, bulk form, dan edit baris. */
export const BASE_PAY_PRESET_VALUES = [785_350, 2_356_050] as const;

export type BasePayPreset = (typeof BASE_PAY_PRESET_VALUES)[number];

/** Tarif sebelumnya → tarif baru (sinkron dengan DB / form lama). */
const LEGACY_BASE_PAY_MAP: Readonly<Record<number, number>> = {
  785_000: 785_350,
  1_570_000: 2_356_050,
  2_350_000: 2_356_050,
};

/**
 * Satukan base pay ke tarif yang diizinkan dan hitung ulang turunannya di
 * {@link syncDerivedFinancials}: expected/actual revenue, profit, insentif.
 */
export function normalizeBasePayForSync(raw: number): number {
  const bp = Math.max(0, Number(raw) || 0);
  const mapped = LEGACY_BASE_PAY_MAP[bp];
  if (mapped !== undefined) return mapped;
  const presets = BASE_PAY_PRESET_VALUES as readonly number[];
  if (presets.includes(bp)) return bp;
  const mid = (presets[0]! + presets[1]!) / 2;
  return bp <= mid ? presets[0]! : presets[1]!;
}

export function formatBasePayLabel(amount: number): string {
  return formatCurrency(amount);
}

export function defaultBasePayPreset(): BasePayPreset {
  return BASE_PAY_PRESET_VALUES[0];
}
