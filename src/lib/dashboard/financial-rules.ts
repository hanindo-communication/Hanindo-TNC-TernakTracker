/** Porsi revenue segmen TNC di kartu overview “TNC Revenue”. */
export const OVERVIEW_TNC_SEGMENT_SHARE = 0.5;

/** Porsi revenue segmen FOLO di kartu overview (bukan 100%). */
export const OVERVIEW_FOLO_SEGMENT_SHARE = 0.54;

/**
 * Bagian expected revenue yang dipakai untuk expected profit pada baris target
 * meja FOLO (kolom Table = folo).
 */
export const FOLO_TARGET_EXPECTED_PROFIT_REVENUE_SHARE = 0.54;

/**
 * Hanindo di perf table & overview: 15% × expected revenue.
 * Di tabel performance: ER = incentives + [TNC exp. profit] + [HND], jadi
 * [TNC] = ER × (1 − ini) − incentives. Rules 54% FOLO untuk profit per baris
 * tetap di `syncDerivedFinancials`; ER & incentives kolom tetap dari sana.
 */
export const HANINDO_SHARING_RATE_ON_TARGET_REVENUE = 0.15;
