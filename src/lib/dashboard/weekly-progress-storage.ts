import { DASHBOARD_REPORT_TIMEZONE, parseMonthKey } from "@/lib/utils";

export const WEEKS = 4 as const;

export type WeeklyProgressRow = {
  id: string;
  weekIndex: number;
  creatorName: string;
  /** Legacy / display; keep in sync when picking from workspace project. */
  campaignName: string;
  /** Workspace `projects.id` when chosen from dropdown; optional for old rows. */
  campaignProjectId?: string;
  /** Jika diisi, baris ini disinkron dari `creator_targets.id` (kolom Week di tabel performa). */
  linkedCreatorTargetId?: string;
  targetVideoSubmit: string;
  targetReqAnotherCreative: string;
  targetApplyCampaign: string;
  submittedVideo: string;
};

export function makeRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyRow(weekIndex: number): WeeklyProgressRow {
  return {
    id: makeRowId(),
    weekIndex,
    creatorName: "",
    campaignName: "",
    campaignProjectId: undefined,
    targetVideoSubmit: "",
    targetReqAnotherCreative: "",
    targetApplyCampaign: "",
    submittedVideo: "",
  };
}

export function parseSubmittedVideoCount(raw: string): number {
  const n = Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Label campaign untuk grafik / grouping: ikut project id bila ada lookup. */
export function campaignLabelFromRow(
  row: WeeklyProgressRow,
  nameByProjectId?: Map<string, string>,
): string {
  const pid = row.campaignProjectId?.trim();
  if (pid && nameByProjectId?.has(pid)) {
    const n = nameByProjectId.get(pid)?.trim();
    if (n) return n;
  }
  const t = row.campaignName.trim();
  return t.length > 0 ? t : "(Tanpa campaign)";
}

export function orderedCampaignKeysForWeeks(
  allRows: WeeklyProgressRow[],
  weekIndices: number[],
  nameByProjectId?: Map<string, string>,
): string[] {
  const wanted = new Set(weekIndices);
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of allRows) {
    if (!wanted.has(r.weekIndex)) continue;
    const k = campaignLabelFromRow(r, nameByProjectId);
    if (seen.has(k)) continue;
    seen.add(k);
    order.push(k);
  }
  return order;
}

export function storageKeyV2(monthKey: string): string {
  return `tnc-ternak-weekly-progress-v2:${monthKey}`;
}

function storageKeyV1(monthKey: string): string {
  return `tnc-ternak-weekly-progress-v1:${monthKey}`;
}

export function getWeekRangeLabelsInMonth(monthKey: string): string[] {
  const d0 = parseMonthKey(monthKey);
  const y = d0.getFullYear();
  const m = d0.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const chunk = Math.ceil(lastDay / 4);
  const monthShort = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(d0);

  const labels: string[] = [];
  for (let w = 0; w < 4; w++) {
    const start = w * chunk + 1;
    const end = Math.min(lastDay, (w + 1) * chunk);
    labels.push(`${monthShort} ${start}–${end}`);
  }
  return labels;
}

/**
 * Minggu 0–3 dalam `monthKey`, mengikuti chunk yang sama dengan label kalender di UI.
 * Jika tanggal (di `timeZone`) tidak di bulan `monthKey`, kembalikan minggu terakhir (3).
 */
export function weekIndexForDateInMonth(
  monthKey: string,
  date: Date,
  timeZone: string,
): 0 | 1 | 2 | 3 {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) return 3;
  const key = `${y}-${m.padStart(2, "0")}`;
  const dayNum = Number.parseInt(d, 10);
  if (key !== monthKey) return 3;

  const parsed = parseMonthKey(monthKey);
  const py = parsed.getFullYear();
  const pm = parsed.getMonth();
  const lastDay = new Date(py, pm + 1, 0).getDate();
  const chunk = Math.ceil(lastDay / 4);
  for (let w = 0; w < 4; w++) {
    const start = w * chunk + 1;
    const end = Math.min(lastDay, (w + 1) * chunk);
    if (dayNum >= start && dayNum <= end) return w as 0 | 1 | 2 | 3;
  }
  return 3;
}

/** Minggu untuk sinkron submit video: hari ini di zona laporan dashboard. */
export function weekIndexNowForTargetMonth(monthKey: string): 0 | 1 | 2 | 3 {
  return weekIndexForDateInMonth(
    monthKey,
    new Date(),
    DASHBOARD_REPORT_TIMEZONE,
  );
}

type LegacyRowV1 = {
  campaignName: string;
  targetVideoSubmit: string;
  targetReqAnotherCreative: string;
  submittedVideo: string;
};

function parseV1(raw: string | null): LegacyRowV1[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || !("rows" in data)) return null;
    const rows = (data as { rows: unknown }).rows;
    if (!Array.isArray(rows) || rows.length !== 8) return null;
    return rows.map((r) => {
      const o = r as Record<string, unknown>;
      return {
        campaignName: String(o.campaignName ?? ""),
        targetVideoSubmit: String(o.targetVideoSubmit ?? ""),
        targetReqAnotherCreative: String(o.targetReqAnotherCreative ?? ""),
        submittedVideo: String(o.submittedVideo ?? ""),
      };
    });
  } catch {
    return null;
  }
}

function migrateV1ToV2(old: LegacyRowV1[]): WeeklyProgressRow[] {
  return old.map((r, i) => ({
    id: makeRowId(),
    weekIndex: Math.min(3, Math.floor(i / 2)),
    creatorName: "",
    campaignName: r.campaignName,
    campaignProjectId: undefined,
    targetVideoSubmit: r.targetVideoSubmit,
    targetReqAnotherCreative: r.targetReqAnotherCreative,
    targetApplyCampaign: "",
    submittedVideo: r.submittedVideo,
  }));
}

function readCampaignProjectId(o: Record<string, unknown>): string | undefined {
  const v = o.campaignProjectId;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function readLinkedCreatorTargetId(
  o: Record<string, unknown>,
): string | undefined {
  const v = o.linkedCreatorTargetId;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/** Minggu untuk sinkron: eksplisit dari target, atau hari ini (zona laporan). */
export function resolveWeeklyWeekForTarget(
  monthKey: string,
  t: { progressWeekIndex: number | null },
): 0 | 1 | 2 | 3 {
  const p = t.progressWeekIndex;
  if (p !== null && p !== undefined && Number.isFinite(p)) {
    const w = Math.floor(Number(p));
    if (w >= 0 && w < WEEKS) return w as 0 | 1 | 2 | 3;
  }
  return weekIndexNowForTargetMonth(monthKey);
}

export function parseV2(raw: string | null): WeeklyProgressRow[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || !("rows" in data)) return null;
    const rows = (data as { rows: unknown }).rows;
    if (!Array.isArray(rows)) return null;
    if (rows.length === 0) {
      return ensureWeekCoverage([]);
    }
    const out: WeeklyProgressRow[] = [];
    for (const r of rows) {
      const o = r as Record<string, unknown>;
      const weekIndex = Number(o.weekIndex);
      if (!Number.isFinite(weekIndex) || weekIndex < 0 || weekIndex > 3) {
        continue;
      }
      const id = typeof o.id === "string" && o.id ? o.id : makeRowId();
      const linkedId = readLinkedCreatorTargetId(o);
      out.push({
        id,
        weekIndex,
        creatorName: String(o.creatorName ?? ""),
        campaignName: String(o.campaignName ?? ""),
        campaignProjectId: readCampaignProjectId(o),
        ...(linkedId ? { linkedCreatorTargetId: linkedId } : {}),
        targetVideoSubmit: String(o.targetVideoSubmit ?? ""),
        targetReqAnotherCreative: String(o.targetReqAnotherCreative ?? ""),
        targetApplyCampaign: String(o.targetApplyCampaign ?? ""),
        submittedVideo: String(o.submittedVideo ?? ""),
      });
    }
    return ensureWeekCoverage(out);
  } catch {
    return null;
  }
}

export function ensureWeekCoverage(rows: WeeklyProgressRow[]): WeeklyProgressRow[] {
  const buckets: WeeklyProgressRow[][] = [[], [], [], []];
  for (const r of rows) {
    if (r.weekIndex >= 0 && r.weekIndex < WEEKS) {
      buckets[r.weekIndex].push(r);
    }
  }
  const next: WeeklyProgressRow[] = [];
  for (let w = 0; w < WEEKS; w++) {
    if (buckets[w].length === 0) next.push(emptyRow(w));
    else next.push(...buckets[w]);
  }
  return next;
}

export function defaultRows(): WeeklyProgressRow[] {
  return [0, 1, 2, 3].map((w) => emptyRow(w));
}

export function insertRowInWeek(
  rows: WeeklyProgressRow[],
  row: WeeklyProgressRow,
): WeeklyProgressRow[] {
  const w = row.weekIndex;
  let insertAt = rows.length;
  let lastIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].weekIndex === w) lastIdx = i;
    if (rows[i].weekIndex > w && insertAt === rows.length) insertAt = i;
  }
  if (lastIdx >= 0) insertAt = lastIdx + 1;
  const copy = rows.slice();
  copy.splice(insertAt, 0, row);
  return copy;
}

export function insertRowAfter(
  rows: WeeklyProgressRow[],
  afterId: string,
  row: WeeklyProgressRow,
): WeeklyProgressRow[] {
  const idx = rows.findIndex((r) => r.id === afterId);
  const copy = rows.slice();
  if (idx < 0) return insertRowInWeek(copy, row);
  copy.splice(idx + 1, 0, row);
  return copy;
}

export function duplicateRowFields(source: WeeklyProgressRow): WeeklyProgressRow {
  return {
    id: makeRowId(),
    weekIndex: source.weekIndex,
    creatorName: source.creatorName,
    campaignName: source.campaignName,
    campaignProjectId: source.campaignProjectId,
    targetVideoSubmit: source.targetVideoSubmit,
    targetReqAnotherCreative: source.targetReqAnotherCreative,
    targetApplyCampaign: source.targetApplyCampaign,
    submittedVideo: source.submittedVideo,
  };
}

export function reorderWithinWeek(
  rows: WeeklyProgressRow[],
  weekIndex: number,
  activeId: string,
  overId: string,
): WeeklyProgressRow[] {
  if (activeId === overId) return rows;
  const segments: WeeklyProgressRow[][] = [[], [], [], []];
  for (const r of rows) {
    if (r.weekIndex >= 0 && r.weekIndex < WEEKS) {
      segments[r.weekIndex].push(r);
    }
  }
  const seg = segments[weekIndex];
  const fromI = seg.findIndex((r) => r.id === activeId);
  const toI = seg.findIndex((r) => r.id === overId);
  if (fromI < 0 || toI < 0) return rows;
  const nextSeg = seg.slice();
  const [moved] = nextSeg.splice(fromI, 1);
  const insertAt = fromI < toI ? toI - 1 : toI;
  nextSeg.splice(insertAt, 0, moved);
  segments[weekIndex] = nextSeg;
  return segments.flat();
}

export function loadRowsFromStorage(monthKey: string): WeeklyProgressRow[] {
  if (typeof window === "undefined") {
    return defaultRows();
  }
  try {
    const rawV2 = window.localStorage.getItem(storageKeyV2(monthKey));
    const parsedV2 = parseV2(rawV2);
    if (parsedV2) return parsedV2;

    const rawV1 = window.localStorage.getItem(storageKeyV1(monthKey));
    const parsedV1 = parseV1(rawV1);
    if (parsedV1) {
      const migrated = migrateV1ToV2(parsedV1);
      try {
        window.localStorage.setItem(
          storageKeyV2(monthKey),
          JSON.stringify({ version: 2, rows: migrated }),
        );
      } catch {
        /* ignore */
      }
      return migrated;
    }
  } catch {
    /* ignore */
  }
  return defaultRows();
}

export function saveRowsToLocalStorage(
  monthKey: string,
  rows: WeeklyProgressRow[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKeyV2(monthKey),
      JSON.stringify({ version: 2, rows }),
    );
  } catch {
    /* ignore */
  }
}
