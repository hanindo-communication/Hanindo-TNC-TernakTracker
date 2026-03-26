import type { Brand, TableSegmentId } from "@/lib/types";
import { normalizeTargetTableSegmentForKey } from "@/lib/types";

/** Filter chip + kolom Table di Submit Targets: hanya 3 opsi tetap. */
export const TABLE_SEGMENT_ALL_ID = "all";

export const TABLE_SEGMENT_TNC: TableSegmentId = "tnc";
export const TABLE_SEGMENT_FOLO: TableSegmentId = "folo";

export const TABLE_CHIP_OPTIONS: { id: string; label: string }[] = [
  { id: TABLE_SEGMENT_ALL_ID, label: "All Creators" },
  { id: TABLE_SEGMENT_TNC, label: "TNC Hanindo Ternak" },
  { id: TABLE_SEGMENT_FOLO, label: "FOLO Ternak" },
];

/**
 * Chip "All Creators": gabungan isi meja TNC + FOLO, ditambah baris segmen `all`
 * (belum ditempatkan ke salah satu meja) agar tetap bisa dipindah lewat Edit.
 */
export function targetMatchesAllCreatorsQuickFilter(tableSegmentId: string): boolean {
  const s = normalizeTargetTableSegmentForKey(tableSegmentId);
  return s === "tnc" || s === "folo" || s === "all";
}

export function targetMatchesTableQuickFilter(
  quickFilterId: string,
  tableSegmentId: string,
): boolean {
  if (quickFilterId === TABLE_SEGMENT_ALL_ID) {
    return targetMatchesAllCreatorsQuickFilter(tableSegmentId);
  }
  return normalizeTargetTableSegmentForKey(tableSegmentId) === quickFilterId;
}

/** Opsi dropdown di Data settings / bulk form (tanpa "All"). */
export const TABLE_SEGMENT_ASSIGN_OPTIONS: { id: TableSegmentId; label: string }[] =
  [
    { id: TABLE_SEGMENT_TNC, label: "TNC Hanindo Ternak" },
    { id: TABLE_SEGMENT_FOLO, label: "FOLO Ternak" },
  ];

export function parseTableSegmentFromDb(
  raw: string | null | undefined,
): TableSegmentId {
  if (raw === "folo") return "folo";
  return "tnc";
}

export function normalizeBrandTableSegment(b: Brand): Brand {
  return {
    ...b,
    tableSegmentId: b.tableSegmentId === "folo" ? "folo" : "tnc",
  };
}
