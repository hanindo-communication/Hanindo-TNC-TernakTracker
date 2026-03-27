import type { AggregatedCreatorRow } from "@/hooks/useCreatorDashboard";
import type { Creator } from "@/lib/types";

function escapeCsvCell(raw: string): string {
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function buildPerformanceTableCsv(args: {
  creators: Creator[];
  creatorRows: AggregatedCreatorRow[];
  monthKey: string;
  includeBreakdown: boolean;
  breakdownByCreator: (creatorId: string) => {
    projectName: string;
    campaignLabel: string;
    tableSegmentLabel: string;
      targetVideos: number;
      submittedVideos: number;
      expectedRevenue: number;
      actualRevenue: number;
  }[];
}): string {
  const lines: string[] = [];
  lines.push(`Month,${escapeCsvCell(args.monthKey)}`);
  lines.push(
    [
      "Creator",
      "Target videos",
      "Submitted",
      "Expected revenue",
      "Actual revenue",
      "Incentives",
      "Reimbursements",
      "TNC exp profit",
      "HND exp profit",
      "Target month",
      "Actual profit",
    ].join(","),
  );

  for (const row of args.creatorRows) {
    const c = args.creators.find((x) => x.id === row.creatorId);
    const name = escapeCsvCell(c?.name ?? row.creatorId);
    const targetMonthCell =
      row.targetMonthKey != null
        ? escapeCsvCell(row.targetMonthKey)
        : escapeCsvCell("(mixed)");
    lines.push(
      [
        name,
        row.targetVideos,
        row.submittedVideos,
        row.expectedRevenue,
        row.actualRevenue,
        row.incentives,
        row.reimbursements,
        row.tncExpectedProfit,
        row.hndExpectedProfit,
        targetMonthCell,
        row.actualProfit,
      ].join(","),
    );
  }

  if (args.includeBreakdown) {
    lines.push("");
    lines.push("Breakdown");
    lines.push(
      [
        "Creator",
        "Project",
        "Campaign",
        "Table",
        "Target",
        "Submitted",
        "Exp rev",
        "Act rev",
      ].join(","),
    );
    for (const row of args.creatorRows) {
      const c = args.creators.find((x) => x.id === row.creatorId);
      const creatorName = escapeCsvCell(c?.name ?? row.creatorId);
      for (const b of args.breakdownByCreator(row.creatorId)) {
        lines.push(
          [
            creatorName,
            escapeCsvCell(b.projectName),
            escapeCsvCell(b.campaignLabel),
            escapeCsvCell(b.tableSegmentLabel),
            b.targetVideos,
            b.submittedVideos,
            b.expectedRevenue,
            b.actualRevenue,
          ].join(","),
        );
      }
    }
  }

  return lines.join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
