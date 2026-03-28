/** Porsi revenue segmen Hanindo PCP (id `tnc`) di kartu overview “TNC revenue”. */
export const OVERVIEW_TNC_SEGMENT_SHARE = 0.5;

/** Porsi revenue segmen FOLO Public (id `folo`) di kartu overview (bukan 100%). */
export const OVERVIEW_FOLO_SEGMENT_SHARE = 0.54;

/**
 * Bagian expected revenue yang dipakai untuk expected profit pada baris target
 * meja FOLO Public (kolom Table = folo).
 */
export const FOLO_TARGET_EXPECTED_PROFIT_REVENUE_SHARE = 0.54;

/**
 * Hanindo di perf table & overview: 15% × expected revenue.
 * Di tabel performance: ER = incentives + [TNC exp. profit] + [HND], jadi
 * [TNC] = ER × (1 − ini) − incentives. Rules 54% FOLO untuk profit per baris
 * tetap di `syncDerivedFinancials`; ER & incentives kolom tetap dari sana.
 */
export const HANINDO_SHARING_RATE_ON_TARGET_REVENUE = 0.15;

/**
 * Alokasi perf table (model lama / baris tanpa % tersimpan): [HND] = rate × ER,
 * [TNC] = ER − incentives − [HND].
 */
export function splitErForTncHndColumns(
  expectedRevenue: number,
  incentives: number,
  hanindoRate: number = HANINDO_SHARING_RATE_ON_TARGET_REVENUE,
): { tncExpectedProfit: number; hndExpectedProfit: number } {
  const r = Math.max(
    0,
    Math.min(0.5, Number.isFinite(hanindoRate) ? hanindoRate : 0),
  );
  const hndExpectedProfit = r * expectedRevenue;
  const tncExpectedProfit = expectedRevenue - incentives - hndExpectedProfit;
  return { tncExpectedProfit, hndExpectedProfit };
}
