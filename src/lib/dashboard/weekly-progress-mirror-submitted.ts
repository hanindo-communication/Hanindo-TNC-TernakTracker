import type { Creator, CreatorTarget, Project } from "@/lib/types";
import { reconcileWeeklyProgressRowsForTargets } from "@/lib/dashboard/weekly-progress-sync-from-targets";
import type { WeeklyProgressRow } from "@/lib/dashboard/weekly-progress-storage";

function resolveCampaignProjectIdFromName(
  campaignName: string,
  options: { id: string; name: string }[],
): string | undefined {
  const t = campaignName.trim().toLowerCase();
  if (!t) return undefined;
  const hit = options.find((o) => o.name.trim().toLowerCase() === t);
  return hit?.id;
}

export function resolveProjectIdForWeeklyRow(
  row: WeeklyProgressRow,
  campaignOptions: { id: string; name: string }[],
): string | null {
  const pid = row.campaignProjectId?.trim();
  if (pid) return pid;
  const fromName = resolveCampaignProjectIdFromName(
    row.campaignName,
    campaignOptions,
  );
  return fromName ?? null;
}

/** Satu creatorId per nama: jika duplikat nama, ambil yang pertama (urut id) agar stabil. */
export function primaryCreatorIdsForName(
  creators: Creator[],
  creatorName: string,
): string[] {
  const t = creatorName.trim().toLowerCase();
  if (!t) return [];
  const hits = creators
    .filter((c) => c.name.trim().toLowerCase() === t)
    .map((c) => c.id)
    .sort();
  return hits.length ? [hits[0]!] : [];
}

export function mirroredSubmittedSumForCreatorProject(args: {
  monthKey: string;
  targets: CreatorTarget[];
  creatorIds: string[];
  projectId: string;
}): number {
  const { monthKey, targets, creatorIds, projectId } = args;
  if (!creatorIds.length || !projectId) return 0;
  let sum = 0;
  for (const t of targets) {
    if (t.month !== monthKey) continue;
    if (!creatorIds.includes(t.creatorId)) continue;
    if (t.projectId !== projectId) continue;
    sum += Math.max(0, Math.floor(Number(t.submittedVideos)) || 0);
  }
  return sum;
}

/**
 * Selaraskan kolom submitted dengan `creator_targets` (sumber breakdown).
 * Baris ter-link memakai submittedVideos leaf yang sama; baris lain memakai agregasi per creator+project.
 */
export function hydrateWeeklyRowsSubmittedFromTargets(args: {
  rows: WeeklyProgressRow[];
  monthKey: string;
  targets: CreatorTarget[];
  creators: Creator[];
  campaignOptions: { id: string; name: string }[];
}): WeeklyProgressRow[] {
  const { rows, monthKey, targets, creators, campaignOptions } = args;
  if (!targets.length) return rows;

  return rows.map((row) => {
    if (row.linkedCreatorTargetId) {
      const t = targets.find((x) => x.id === row.linkedCreatorTargetId);
      if (t && t.month === monthKey) {
        return {
          ...row,
          submittedVideo: String(
            Math.max(0, Math.floor(Number(t.submittedVideos)) || 0),
          ),
        };
      }
    }

    const creatorIds = primaryCreatorIdsForName(creators, row.creatorName);
    const projectId = resolveProjectIdForWeeklyRow(row, campaignOptions);
    if (!projectId || !creatorIds.length) {
      return { ...row, submittedVideo: "0" };
    }

    const sum = mirroredSubmittedSumForCreatorProject({
      monthKey,
      targets,
      creatorIds,
      projectId,
    });
    return { ...row, submittedVideo: String(sum) };
  });
}

/** Muat dokumen weekly + rekonsiliasi baris ter-link + hydrate submitted dari target. */
export function applyWeeklyTargetsHydration(args: {
  rows: WeeklyProgressRow[];
  monthKey: string;
  targets: CreatorTarget[];
  creators: Creator[];
  projects: Project[];
  campaignOptions: { id: string; name: string }[];
}): WeeklyProgressRow[] {
  if (!args.targets.length) {
    return args.rows;
  }
  const reconciled = reconcileWeeklyProgressRowsForTargets({
    rows: args.rows,
    monthKey: args.monthKey,
    targets: args.targets,
    creators: args.creators,
    projects: args.projects,
  });
  return hydrateWeeklyRowsSubmittedFromTargets({
    rows: reconciled,
    monthKey: args.monthKey,
    targets: args.targets,
    creators: args.creators,
    campaignOptions: args.campaignOptions,
  });
}
