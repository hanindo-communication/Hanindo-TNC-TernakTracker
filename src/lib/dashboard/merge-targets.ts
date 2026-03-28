import { normalizeBasePayForSync } from "@/lib/dashboard/base-pay-presets";
import {
  FOLO_TARGET_EXPECTED_PROFIT_REVENUE_SHARE,
  splitErForTncHndColumns,
} from "@/lib/dashboard/financial-rules";
import { filterPlausibleVideoUrls } from "@/lib/dashboard/video-urls";
import type { CreatorTarget, TargetFormRow } from "@/lib/types";
import {
  buildTargetCompositeKey,
  normalizeTargetTableSegmentForKey,
} from "@/lib/types";

const SHARING_PCT_THRESHOLD = 1;

function clampStoredPercent(n: number): number {
  return Math.min(100, Math.max(0, Math.round(Number(n) * 10) / 10));
}

/** Baris memakai nominal = expectedRevenue × (% / 100), ER = target × base pay. */
export function usesSharingPercentModel(
  t: Pick<
    CreatorTarget,
    "incentivePercent" | "tncSharingPercent" | "hndSharingPercent"
  >,
): boolean {
  const a = Number(t.incentivePercent) || 0;
  const b = Number(t.tncSharingPercent) || 0;
  const c = Number(t.hndSharingPercent) || 0;
  return (
    a >= SHARING_PCT_THRESHOLD &&
    b >= SHARING_PCT_THRESHOLD &&
    c >= SHARING_PCT_THRESHOLD
  );
}

function clampSubmitPercent(n: number): number {
  return Math.min(100, Math.max(1, Math.round(Number(n)) || 0));
}

/**
 * Single source of truth: expected revenue & incentives dari leaf target,
 * bukan kolom tersimpan yang bisa stale (seed lama / upsert parsial).
 *
 * - expected revenue = targetVideos × basePay
 * - Model %: incentives / TNC / HND = expectedRevenue × (pct/100) jika ketiga pct ≥ 1
 * - Model lama: incentives = targetVideos × incentivePerVideo; TNC/HND dihitung di agregasi
 * - expected profit: basis revenue = expected revenue; segmen meja FOLO Public memakai
 *   porsi {@link FOLO_TARGET_EXPECTED_PROFIT_REVENUE_SHARE} sebelum kurangi insentif & reimb.
 */
export function syncDerivedFinancials(t: CreatorTarget): CreatorTarget {
  const tv = Math.max(0, Math.floor(Number(t.targetVideos)) || 0);
  const bp = normalizeBasePayForSync(t.basePay);
  const ipv = Math.max(0, Math.floor(Number(t.incentivePerVideo)) || 0);
  const expectedRevenue = tv * bp;
  /** Dasar bagi persentase: expected revenue baris (target × base pay). */
  const pctBase = expectedRevenue;

  const incPct = clampStoredPercent(t.incentivePercent ?? 0);
  const tncPct = clampStoredPercent(t.tncSharingPercent ?? 0);
  const hndPct = clampStoredPercent(t.hndSharingPercent ?? 0);
  const usePct =
    incPct >= SHARING_PCT_THRESHOLD &&
    tncPct >= SHARING_PCT_THRESHOLD &&
    hndPct >= SHARING_PCT_THRESHOLD;

  let incentives: number;
  let tncSharingAmount: number;
  let hndSharingAmount: number;

  if (usePct) {
    incentives = (pctBase * incPct) / 100;
    tncSharingAmount = (pctBase * tncPct) / 100;
    hndSharingAmount = (pctBase * hndPct) / 100;
  } else {
    incentives = tv * ipv;
    tncSharingAmount = 0;
    hndSharingAmount = 0;
  }

  const seg = normalizeTargetTableSegmentForKey(t.tableSegmentId);
  const profitRevenueBase =
    seg === "folo"
      ? expectedRevenue * FOLO_TARGET_EXPECTED_PROFIT_REVENUE_SHARE
      : expectedRevenue;
  const expectedProfit = profitRevenueBase - incentives - t.reimbursements;

  const urlList = filterPlausibleVideoUrls(
    (t.submittedVideoUrls ?? []).map((s) => String(s).trim()),
  );
  const storedSubmitted = Math.max(0, Math.floor(Number(t.submittedVideos)) || 0);
  const submittedVideos =
    urlList.length > 0
      ? Math.max(urlList.length, storedSubmitted)
      : storedSubmitted;
  const actualRevenue = submittedVideos * bp;
  const actualProfit = actualRevenue - incentives - t.reimbursements;
  return {
    ...t,
    targetVideos: tv,
    basePay: bp,
    incentivePerVideo: usePct ? 0 : ipv,
    incentivePercent: usePct ? incPct : clampStoredPercent(t.incentivePercent ?? 0),
    tncSharingPercent: usePct
      ? tncPct
      : clampStoredPercent(t.tncSharingPercent ?? 0),
    hndSharingPercent: usePct
      ? hndPct
      : clampStoredPercent(t.hndSharingPercent ?? 0),
    incentives,
    tncSharingAmount,
    hndSharingAmount,
    submittedVideos,
    submittedVideoUrls: urlList,
    expectedRevenue,
    expectedProfit,
    actualRevenue,
    actualProfit,
  };
}

function tableSegmentFromFormRow(row: TargetFormRow): string {
  return normalizeTargetTableSegmentForKey(row.tableSegmentId);
}

/** Payload simpan dari dialog Edit target (satu baris leaf). */
export interface CreatorTargetRowEditPayload {
  targetVideos: number;
  tableSegmentId: string;
  basePay: number;
  incentivePercent: number;
  tncSharingPercent: number;
  hndSharingPercent: number;
}

export type CreatorTargetRowSave = CreatorTargetRowEditPayload & {
  targetId: string;
};

/** Terapkan edit penuh satu baris + sync expected revenue / incentives / profit. */
export function applyTargetRowEdit(
  t: CreatorTarget,
  edit: CreatorTargetRowEditPayload,
): CreatorTarget {
  return syncDerivedFinancials({
    ...t,
    targetVideos: Math.max(0, Math.floor(Number(edit.targetVideos)) || 0),
    tableSegmentId: normalizeTargetTableSegmentForKey(edit.tableSegmentId),
    basePay: Math.max(0, Number(edit.basePay) || 0),
    incentivePercent: clampSubmitPercent(edit.incentivePercent),
    tncSharingPercent: clampSubmitPercent(edit.tncSharingPercent),
    hndSharingPercent: clampSubmitPercent(edit.hndSharingPercent),
    incentivePerVideo: 0,
  });
}

/** Update leaf target video count and recompute expected revenue / profit (actuals unchanged). */
export function applyTargetVideosUpdate(
  t: CreatorTarget,
  targetVideos: number,
): CreatorTarget {
  const v = Math.max(0, Math.floor(Number(targetVideos)) || 0);
  return syncDerivedFinancials({ ...t, targetVideos: v });
}

/** Tambah hitungan submit tanpa URL (delta saja). */
export function applySubmittedVideosDelta(
  t: CreatorTarget,
  delta: number,
): CreatorTarget {
  const d = Math.max(0, Math.floor(Number(delta)) || 0);
  if (d <= 0) return syncDerivedFinancials(t);
  const prev = Math.max(0, Math.floor(Number(t.submittedVideos)) || 0);
  return syncDerivedFinancials({ ...t, submittedVideos: prev + d });
}

/** Tambah URL video yang disubmit; menyatukan dengan daftar ada (dedupe). */
export function appendSubmittedVideoUrls(
  t: CreatorTarget,
  newUrls: string[],
): CreatorTarget {
  const add = filterPlausibleVideoUrls(
    newUrls.map((s) => String(s).trim()),
  );
  if (add.length === 0) return syncDerivedFinancials(t);

  const existing = filterPlausibleVideoUrls(
    (t.submittedVideoUrls ?? []).map((s) => String(s).trim()),
  );
  const seen = new Set(existing.map((u) => u.toLowerCase()));
  const merged = [...existing];
  for (const u of add) {
    const k = u.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(u);
  }

  const prevCount = Math.max(0, Math.floor(Number(t.submittedVideos)) || 0);
  const delta = merged.length - existing.length;
  const nextSubmitted =
    existing.length === 0 && prevCount > 0
      ? prevCount + delta
      : merged.length;

  return syncDerivedFinancials({
    ...t,
    submittedVideoUrls: merged,
    submittedVideos: nextSubmitted,
  });
}

/** Ganti daftar URL sepenuhnya (dari editor meja). */
export function replaceSubmittedVideoUrls(
  t: CreatorTarget,
  urls: string[],
): CreatorTarget {
  const cleaned = filterPlausibleVideoUrls(
    urls.map((s) => String(s).trim()),
  );
  return syncDerivedFinancials({
    ...t,
    submittedVideoUrls: cleaned,
    submittedVideos: cleaned.length,
  });
}

function compositeKeyFromRow(
  row: TargetFormRow,
  campaignObjectiveId: string,
): string {
  return buildTargetCompositeKey({
    creatorId: row.creatorId,
    projectId: row.projectId,
    campaignObjectiveId,
    tiktokAccountId: row.tiktokAccountId,
    month: row.month,
    tableSegmentId: tableSegmentFromFormRow(row),
  });
}

export function mergeTargetForms(
  prev: CreatorTarget[],
  rows: TargetFormRow[],
  defaultCampaignObjectiveId: string,
): CreatorTarget[] {
  const map = new Map<string, CreatorTarget>();
  for (const t of prev) {
    map.set(buildTargetCompositeKey(t), t);
  }

  for (const row of rows) {
    const key = compositeKeyFromRow(row, defaultCampaignObjectiveId);
    const existing = map.get(key);
    const id = existing?.id ?? crypto.randomUUID();
    const submittedVideos = existing?.submittedVideos ?? 0;
    const submittedVideoUrls = existing?.submittedVideoUrls ?? [];
    const reimbursements = existing?.reimbursements ?? 0;

    const targetVideos = Math.max(0, Math.floor(Number(row.targetVideos)) || 0);
    const incentivePercent = clampSubmitPercent(row.incentivePercent);
    const tncSharingPercent = clampSubmitPercent(row.tncSharingPercent);
    const hndSharingPercent = clampSubmitPercent(row.hndSharingPercent);

    const next: CreatorTarget = syncDerivedFinancials({
      id,
      creatorId: row.creatorId,
      projectId: row.projectId,
      campaignObjectiveId: defaultCampaignObjectiveId,
      creatorType: row.creatorType,
      tiktokAccountId: row.tiktokAccountId,
      month: row.month,
      tableSegmentId: tableSegmentFromFormRow(row),
      targetVideos,
      submittedVideos,
      submittedVideoUrls,
      incentivePerVideo: 0,
      incentivePercent,
      tncSharingPercent,
      hndSharingPercent,
      tncSharingAmount: 0,
      hndSharingAmount: 0,
      basePay: row.basePay,
      expectedRevenue: 0,
      actualRevenue: 0,
      incentives: 0,
      reimbursements,
      expectedProfit: 0,
      actualProfit: 0,
    });
    map.set(key, next);
  }

  return [...map.values()];
}

type SharingEditInferInput = Pick<
  CreatorTarget,
  | "incentivePercent"
  | "tncSharingPercent"
  | "hndSharingPercent"
  | "targetVideos"
  | "basePay"
  | "incentivePerVideo"
>;

/** Infer % untuk form edit dari baris legacy (incentive_per_video + split Hanindo). */
export function inferSharingPercentsForEdit(
  t: SharingEditInferInput,
  hanindoRateFraction: number,
): { incentivePercent: number; tncSharingPercent: number; hndSharingPercent: number } {
  if (usesSharingPercentModel(t)) {
    return {
      incentivePercent: Math.round(t.incentivePercent),
      tncSharingPercent: Math.round(t.tncSharingPercent),
      hndSharingPercent: Math.round(t.hndSharingPercent),
    };
  }
  const bp = Math.max(0, Number(t.basePay) || 0);
  const tv = Math.max(0, Math.floor(Number(t.targetVideos)) || 0);
  const ipv = Math.max(0, Math.floor(Number(t.incentivePerVideo)) || 0);
  const inc = tv * ipv;
  const er = tv * bp;
  if (er <= 0) {
    return { incentivePercent: 31, tncSharingPercent: 54, hndSharingPercent: 15 };
  }
  const { tncExpectedProfit, hndExpectedProfit } = splitErForTncHndColumns(
    er,
    inc,
    hanindoRateFraction,
  );
  const toPctOfEr = (nominal: number) =>
    Math.min(100, Math.max(1, Math.round((nominal / er) * 100)));
  return {
    incentivePercent: toPctOfEr(inc),
    tncSharingPercent: toPctOfEr(tncExpectedProfit),
    hndSharingPercent: toPctOfEr(hndExpectedProfit),
  };
}
