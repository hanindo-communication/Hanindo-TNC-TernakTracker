"use client";

import { Film, TrendingUp, Wallet } from "lucide-react";
import type { TotalRow } from "@/hooks/useCreatorDashboard";
import { cn, formatCurrency, labelMonth } from "@/lib/utils";

function videoCompletionRatio(submitted: number, target: number): number {
  if (target <= 0) return submitted > 0 ? 100 : 0;
  return Math.min(100, (submitted / target) * 100);
}

function metricDeltaTone(
  current: number,
  previous: number,
): "up" | "down" | "flat" | "new" {
  if (previous <= 0 && current <= 0) return "flat";
  if (previous <= 0 && current > 0) return "new";
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) return "flat";
  return pct > 0 ? "up" : "down";
}

function formatPctDelta(current: number, previous: number): string {
  const tone = metricDeltaTone(current, previous);
  if (tone === "flat")
    return previous <= 0 && current <= 0 ? "—" : "~0% vs bulan lalu";
  if (tone === "new") return "Baru vs bulan lalu";
  const pct = ((current - previous) / Math.max(previous, 1e-9)) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% vs bulan lalu`;
}

function toneClass(
  tone: ReturnType<typeof metricDeltaTone>,
  invertGood?: boolean,
): string {
  const good = invertGood ? "down" : "up";
  const bad = invertGood ? "up" : "down";
  return cn(
    tone === good && "text-emerald-400/95",
    tone === bad && "text-amber-300/95",
    tone === "flat" && "text-muted",
    tone === "new" && "text-neon-cyan/90",
  );
}

interface DashboardKpiStripProps {
  totalRow: TotalRow;
  totalRowPreviousMonth: TotalRow | null;
  previousMonthKey: string;
}

export function DashboardKpiStrip({
  totalRow,
  totalRowPreviousMonth,
  previousMonthKey,
}: DashboardKpiStripProps) {
  const prev = totalRowPreviousMonth;
  const prevLabel = labelMonth(previousMonthKey);

  const completion = videoCompletionRatio(
    totalRow.submittedVideos,
    totalRow.targetVideos,
  );
  const completionPrev = prev
    ? videoCompletionRatio(prev.submittedVideos, prev.targetVideos)
    : 0;
  const completionDeltaTone = metricDeltaTone(completion, completionPrev);

  const erTone = metricDeltaTone(totalRow.expectedRevenue, prev?.expectedRevenue ?? 0);
  const tncTone = metricDeltaTone(totalRow.tncExpectedProfit, prev?.tncExpectedProfit ?? 0);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="glass-panel rounded-2xl border border-white/[0.08] p-4 neon-border-hover">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          <Film className="h-3.5 w-3.5 text-neon-cyan" />
          Submit video
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
          {totalRow.submittedVideos}
          <span className="text-base font-normal text-muted">
            {" "}
            / {totalRow.targetVideos}
          </span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-[width] duration-500 ease-out"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="mt-2 text-xs tabular-nums text-muted">
          {totalRow.targetVideos > 0
            ? `${completion.toFixed(0)}% dari target`
            : totalRow.submittedVideos > 0
              ? "Tanpa kuota target"
              : "Belum ada submit"}
        </p>
        {prev ? (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              toneClass(completionDeltaTone),
            )}
          >
            Bulan lalu ({prevLabel}): {completionPrev.toFixed(0)}% (
            {prev.submittedVideos}/{prev.targetVideos})
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">
            Tidak ada baris di {prevLabel} untuk filter ini.
          </p>
        )}
      </div>

      <div className="glass-panel rounded-2xl border border-white/[0.08] p-4 neon-border-hover">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          <TrendingUp className="h-3.5 w-3.5 text-neon-cyan" />
          Expected revenue
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
          {formatCurrency(totalRow.expectedRevenue)}
        </p>
        <p className={cn("mt-2 text-xs font-medium", toneClass(erTone))}>
          {formatPctDelta(
            totalRow.expectedRevenue,
            prev?.expectedRevenue ?? 0,
          )}
        </p>
        {prev ? (
          <p className="mt-1 text-xs text-muted">
            {prevLabel}: {formatCurrency(prev.expectedRevenue)}
          </p>
        ) : null}
      </div>

      <div className="glass-panel rounded-2xl border border-neon-cyan/15 bg-neon-cyan/[0.04] p-4 neon-border-hover">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          <Wallet className="h-3.5 w-3.5 text-neon-cyan" />
          [TNC] exp. profit (agregat)
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums text-neon-cyan">
          {formatCurrency(totalRow.tncExpectedProfit)}
        </p>
        <p className={cn("mt-2 text-xs font-medium", toneClass(tncTone))}>
          {formatPctDelta(
            totalRow.tncExpectedProfit,
            prev?.tncExpectedProfit ?? 0,
          )}
        </p>
        {prev ? (
          <p className="mt-1 text-xs text-muted">
            {prevLabel}: {formatCurrency(prev.tncExpectedProfit)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
