import type { SupabaseClient } from "@supabase/supabase-js";
import { filterPlausibleVideoUrls } from "@/lib/dashboard/video-urls";
import {
  fetchWeeklyProgressDocument,
  persistWeeklyProgressDocument,
} from "@/lib/dashboard/supabase-data";
import type { Creator, CreatorTarget, Project } from "@/lib/types";
import {
  emptyRow,
  insertRowInWeek,
  loadRowsFromStorage,
  parseSubmittedVideoCount,
  parseV2,
  saveRowsToLocalStorage,
  type WeeklyProgressRow,
  weekIndexNowForTargetMonth,
} from "./weekly-progress-storage";

function plausibleUrlCount(t: CreatorTarget): number {
  return filterPlausibleVideoUrls(
    (t.submittedVideoUrls ?? []).map((s) => String(s).trim()),
  ).length;
}

function rowMatchesTarget(
  row: WeeklyProgressRow,
  creatorName: string,
  projectId: string,
  campaignName: string,
): boolean {
  const cn = row.creatorName.trim();
  if (cn !== creatorName.trim()) return false;
  if (row.campaignProjectId?.trim() === projectId) return true;
  const rowCamp = row.campaignName.trim().toLowerCase();
  const wantCamp = campaignName.trim().toLowerCase();
  return Boolean(rowCamp && wantCamp && rowCamp === wantCamp);
}

/**
 * Setelah jumlah URL valid pada satu target berubah, sesuaikan dokumen weekly:
 * cari baris creator+campaign+minggu atau buat baris baru, lalu tambah/kurangi submitted.
 */
export function applyUrlCountDeltaToWeeklyRows(args: {
  rows: WeeklyProgressRow[];
  targetMonthKey: string;
  creatorName: string;
  projectId: string;
  campaignName: string;
  /** Positif = URL baru; negatif = URL dihapus. */
  deltaPlausibleUrls: number;
}): WeeklyProgressRow[] {
  const {
    rows,
    targetMonthKey,
    creatorName,
    projectId,
    campaignName,
    deltaPlausibleUrls,
  } = args;
  if (deltaPlausibleUrls === 0) return rows;

  const weekIndex = weekIndexNowForTargetMonth(targetMonthKey);
  const inWeek = rows.filter(
    (r) =>
      r.weekIndex === weekIndex &&
      rowMatchesTarget(r, creatorName, projectId, campaignName),
  );
  const targetRow = inWeek[0];
  const next = rows.slice();

  if (!targetRow) {
    const newRow: WeeklyProgressRow = {
      ...emptyRow(weekIndex),
      creatorName: creatorName.trim(),
      campaignProjectId: projectId,
      campaignName: campaignName.trim(),
      submittedVideo: String(Math.max(0, deltaPlausibleUrls)),
    };
    return insertRowInWeek(next, newRow);
  }

  return next.map((r) => {
    if (r.id !== targetRow.id) return r;
    const cur = parseSubmittedVideoCount(r.submittedVideo);
    const nextCount = Math.max(0, cur + deltaPlausibleUrls);
    return {
      ...r,
      campaignProjectId: projectId,
      campaignName: campaignName.trim() || r.campaignName,
      submittedVideo: String(nextCount),
    };
  });
}

export function plausibleUrlCountDelta(
  before: CreatorTarget,
  after: CreatorTarget,
): number {
  return plausibleUrlCount(after) - plausibleUrlCount(before);
}

/**
 * Gabungkan delta URL untuk semua target di `monthKey`. Mengembalikan null jika tidak ada perubahan.
 */
export function syncWeeklyProgressAfterTargetVideoChange(args: {
  remoteDocJson: string | null;
  loadFromStorage: (monthKey: string) => WeeklyProgressRow[];
  monthKey: string;
  beforeTargets: CreatorTarget[];
  afterTargets: CreatorTarget[];
  creators: Creator[];
  projects: Project[];
}): WeeklyProgressRow[] | null {
  const {
    remoteDocJson,
    loadFromStorage,
    monthKey,
    beforeTargets,
    afterTargets,
    creators,
    projects,
  } = args;

  const byIdBefore = new Map(beforeTargets.map((t) => [t.id, t]));
  const campaignNameByProjectId = new Map(
    projects.map((p) => [p.id, p.name]),
  );
  const creatorNameById = new Map(creators.map((c) => [c.id, c.name]));

  const parsedRemote =
    remoteDocJson !== null ? parseV2(remoteDocJson) : null;
  let rows: WeeklyProgressRow[] =
    parsedRemote ?? loadFromStorage(monthKey);

  let applied = false;

  for (const after of afterTargets) {
    if (after.month !== monthKey) continue;
    const before = byIdBefore.get(after.id);
    if (!before) continue;
    const delta = plausibleUrlCountDelta(before, after);
    if (delta === 0) continue;

    applied = true;
    const creatorName = creatorNameById.get(after.creatorId) ?? "";
    const campaignName =
      campaignNameByProjectId.get(after.projectId) ?? "";

    rows = applyUrlCountDeltaToWeeklyRows({
      rows,
      targetMonthKey: monthKey,
      creatorName,
      projectId: after.projectId,
      campaignName,
      deltaPlausibleUrls: delta,
    });
  }

  return applied ? rows : null;
}

/** Setelah `persistTargets` sukses, selaraskan dokumen weekly per bulan yang terdampak. */
export async function persistWeeklyProgressAfterTargetVideoEdits(
  supabase: SupabaseClient | null,
  before: {
    targets: CreatorTarget[];
    creators: Creator[];
    projects: Project[];
  },
  afterTargets: CreatorTarget[],
): Promise<void> {
  const byIdBefore = new Map(before.targets.map((t) => [t.id, t]));
  const months = new Set<string>();
  for (const after of afterTargets) {
    const prevT = byIdBefore.get(after.id);
    if (!prevT) continue;
    if (plausibleUrlCountDelta(prevT, after) !== 0) months.add(after.month);
  }
  for (const monthKey of months) {
    const remoteDocJson = supabase
      ? await fetchWeeklyProgressDocument(supabase, monthKey)
      : null;
    const merged = syncWeeklyProgressAfterTargetVideoChange({
      remoteDocJson,
      loadFromStorage: loadRowsFromStorage,
      monthKey,
      beforeTargets: before.targets,
      afterTargets,
      creators: before.creators,
      projects: before.projects,
    });
    if (!merged) continue;
    saveRowsToLocalStorage(monthKey, merged);
    if (supabase) {
      await persistWeeklyProgressDocument(supabase, monthKey, {
        version: 2,
        rows: merged,
      });
    }
  }
}
