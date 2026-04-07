import {
  campaignLabelFromRow,
  getWeekRangeLabelsInMonth,
  orderedCampaignKeysForWeeks,
  parseSubmittedVideoCount,
  type WeeklyProgressRow,
  WEEKS,
} from "@/lib/dashboard/weekly-progress-storage";

export interface WeeklySubmittedChartRow {
  weekLabel: string;
  [campaignKey: string]: string | number;
}

export function weekSubmittedTotals(rows: WeeklyProgressRow[]): number[] {
  const totals = [0, 0, 0, 0];
  for (const r of rows) {
    const w = r.weekIndex;
    if (w >= 0 && w < WEEKS) {
      totals[w] += parseSubmittedVideoCount(r.submittedVideo);
    }
  }
  return totals;
}

export function buildStackedSubmittedChartData(
  rows: WeeklyProgressRow[],
  chartWeekIndices: number[],
  monthKey: string,
  nameByProjectId?: Map<string, string>,
): {
  data: WeeklySubmittedChartRow[];
  campaignKeys: string[];
} {
  const weekRangesInMonth = getWeekRangeLabelsInMonth(monthKey);
  const stackedChartCampaignKeys = orderedCampaignKeysForWeeks(
    rows,
    chartWeekIndices,
    nameByProjectId,
  );
  const keys = stackedChartCampaignKeys;
  const data: WeeklySubmittedChartRow[] = chartWeekIndices.map((w) => {
    const rangeLabel = weekRangesInMonth[w] ?? "";
    const row: WeeklySubmittedChartRow = {
      weekLabel: `Week ${w + 1} · ${rangeLabel}`,
    };
    for (const k of keys) row[k] = 0;
    for (const r of rows) {
      if (r.weekIndex !== w) continue;
      const k = campaignLabelFromRow(r, nameByProjectId);
      const add = parseSubmittedVideoCount(r.submittedVideo);
      row[k] = (row[k] as number) + add;
    }
    return row;
  });
  return { data, campaignKeys: keys };
}
