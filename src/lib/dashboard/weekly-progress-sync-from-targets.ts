import type { SupabaseClient } from "@supabase/supabase-js";
import { filterPlausibleVideoUrls } from "@/lib/dashboard/video-urls";
import {
  fetchWeeklyProgressDocument,
  persistWeeklyProgressDocument,
} from "@/lib/dashboard/supabase-data";
import type { Creator, CreatorTarget, Project } from "@/lib/types";
import {
  emptyRow,
  ensureWeekCoverage,
  insertRowInWeek,
  loadRowsFromStorage,
  parseSubmittedVideoCount,
  parseV2,
  resolveWeeklyWeekForTarget,
  saveRowsToLocalStorage,
  type WeeklyProgressRow,
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
  weekIndex: number;
  creatorName: string;
  projectId: string;
  campaignName: string;
  /** Positif = URL baru; negatif = URL dihapus. */
  deltaPlausibleUrls: number;
}): WeeklyProgressRow[] {
  const {
    rows,
    weekIndex,
    creatorName,
    projectId,
    campaignName,
    deltaPlausibleUrls,
  } = args;
  if (deltaPlausibleUrls === 0) return rows;

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

function storedSubmittedVideos(t: CreatorTarget): number {
  return Math.max(0, Math.floor(Number(t.submittedVideos)) || 0);
}

/**
 * Delta yang harus diterapkan ke baris weekly (minggu berjalan) agar selaras dengan
 * angka di meja performa (breakdown). Memakai `submittedVideos` bila berubah;
 * jika hanya URL yang berubah sementara count tetap (mis. legacy tanpa URL lalu diisi link),
 * memakai delta jumlah URL yang valid.
 */
export function weeklySubmittedSyncDelta(
  before: CreatorTarget,
  after: CreatorTarget,
): number {
  const countDelta = storedSubmittedVideos(after) - storedSubmittedVideos(before);
  const urlDelta = plausibleUrlCountDelta(before, after);
  if (countDelta !== 0) return countDelta;
  if (urlDelta !== 0) return urlDelta;
  return 0;
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
    const delta = weeklySubmittedSyncDelta(before, after);
    if (delta === 0) continue;

    applied = true;
    const creatorName = creatorNameById.get(after.creatorId) ?? "";
    const campaignName =
      campaignNameByProjectId.get(after.projectId) ?? "";
    const weekIndex = resolveWeeklyWeekForTarget(monthKey, after);

    rows = applyUrlCountDeltaToWeeklyRows({
      rows,
      weekIndex,
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
    if (weeklySubmittedSyncDelta(prevT, after) !== 0) months.add(after.month);
  }
  for (const monthKey of months) {
    const remoteDocJson = supabase
      ? await fetchWeeklyProgressDocument(supabase, monthKey)
      : null;
    const parsed = remoteDocJson ? parseV2(remoteDocJson) : null;
    let baseRows: WeeklyProgressRow[] =
      parsed ?? loadRowsFromStorage(monthKey);
    const videoMerged = syncWeeklyProgressAfterTargetVideoChange({
      remoteDocJson,
      loadFromStorage: loadRowsFromStorage,
      monthKey,
      beforeTargets: before.targets,
      afterTargets,
      creators: before.creators,
      projects: before.projects,
    });
    if (videoMerged) baseRows = videoMerged;
    const finalRows = reconcileWeeklyProgressRowsForTargets({
      rows: baseRows,
      monthKey,
      targets: afterTargets,
      creators: before.creators,
      projects: before.projects,
    });
    saveRowsToLocalStorage(monthKey, finalRows);
    if (supabase) {
      await persistWeeklyProgressDocument(supabase, monthKey, {
        version: 2,
        rows: finalRows,
      });
    }
  }
}

/**
 * Sinkronkan baris weekly yang terhubung ke `creator_targets` (kolom Week / campaign).
 * Baris dengan `linkedCreatorTargetId` yang tidak lagi ada di `targets` akan dihapus.
 */
export function reconcileWeeklyProgressRowsForTargets(args: {
  rows: WeeklyProgressRow[];
  monthKey: string;
  targets: CreatorTarget[];
  creators: Creator[];
  projects: Project[];
}): WeeklyProgressRow[] {
  const { rows, monthKey, targets, creators, projects } = args;
  let next = rows.filter((r) => {
    if (!r.linkedCreatorTargetId) return true;
    const t = targets.find((x) => x.id === r.linkedCreatorTargetId);
    if (!t || t.month !== monthKey) return false;
    return true;
  });

  const creatorNameById = new Map(creators.map((c) => [c.id, c.name]));
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  for (const t of targets) {
    if (t.month !== monthKey) continue;
    const pw = t.progressWeekIndex;
    const idx = next.findIndex((r) => r.linkedCreatorTargetId === t.id);

    if (pw === null || pw === undefined || pw < 0 || pw >= 4) {
      if (idx >= 0) next.splice(idx, 1);
      continue;
    }

    const cn = (creatorNameById.get(t.creatorId) ?? "").trim();
    const pn = (projectNameById.get(t.projectId) ?? "").trim();

    if (idx >= 0) {
      const old = next[idx];
      next.splice(idx, 1);
      next = insertRowInWeek(next, {
        ...old,
        weekIndex: pw,
        creatorName: cn,
        campaignProjectId: t.projectId,
        campaignName: pn,
        targetVideoSubmit: String(t.targetVideos),
        submittedVideo: String(t.submittedVideos),
        linkedCreatorTargetId: t.id,
      });
    } else {
      next = insertRowInWeek(next, {
        ...emptyRow(pw),
        creatorName: cn,
        campaignProjectId: t.projectId,
        campaignName: pn,
        targetVideoSubmit: String(t.targetVideos),
        targetReqAnotherCreative: "",
        targetApplyCampaign: "",
        submittedVideo: String(t.submittedVideos),
        linkedCreatorTargetId: t.id,
      });
    }
  }

  return ensureWeekCoverage(next);
}

/** Muat dokumen weekly + rekonsiliasi dengan target bulan itu; simpan lokal & Supabase. */
export async function syncWeeklyProgressWithTargetsForMonth(
  supabase: SupabaseClient | null,
  monthKey: string,
  targets: CreatorTarget[],
  creators: Creator[],
  projects: Project[],
): Promise<void> {
  const remoteDocJson = supabase
    ? await fetchWeeklyProgressDocument(supabase, monthKey)
    : null;
  const parsed = remoteDocJson ? parseV2(remoteDocJson) : null;
  const base = parsed ?? loadRowsFromStorage(monthKey);
  const merged = reconcileWeeklyProgressRowsForTargets({
    rows: base,
    monthKey,
    targets,
    creators,
    projects,
  });
  saveRowsToLocalStorage(monthKey, merged);
  if (supabase) {
    await persistWeeklyProgressDocument(supabase, monthKey, {
      version: 2,
      rows: merged,
    });
  }
}
