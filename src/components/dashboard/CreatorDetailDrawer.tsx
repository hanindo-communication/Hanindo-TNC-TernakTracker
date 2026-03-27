"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Image from "next/image";
import type { Creator } from "@/lib/types";
import { cn, formatCurrency, labelMonth } from "@/lib/utils";
import { CreatorTypeChip } from "@/components/dashboard/CreatorTypeChip";
import { MiniRevenueAreaChart } from "@/components/dashboard/MiniRevenueAreaChart";
import type { AggregatedCreatorRow } from "@/hooks/useCreatorDashboard";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

function videoCompletionRatio(submitted: number, target: number): number {
  if (target <= 0) return submitted > 0 ? 100 : 0;
  return Math.min(100, (submitted / target) * 100);
}

interface CreatorDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creator: Creator;
  aggregate: AggregatedCreatorRow;
  aggregatePreviousMonth: AggregatedCreatorRow | null;
  previousMonthKey: string;
  revenueSeries: { monthKey: string; value: number }[];
}

export function CreatorDetailDrawer({
  open,
  onOpenChange,
  creator,
  aggregate,
  aggregatePreviousMonth,
  previousMonthKey,
  revenueSeries,
}: CreatorDetailDrawerProps) {
  const reducedMotion = usePrefersReducedMotion();

  const avatarSrc = (creator.avatarUrl ?? "").trim();
  const hasAvatar = avatarSrc.length > 0;

  const chartPoints = revenueSeries.map((p) => ({
    monthKey: p.monthKey,
    value: p.value,
  }));

  const prevLabel = labelMonth(previousMonthKey);
  const lastMoCompletion = aggregatePreviousMonth
    ? videoCompletionRatio(
        aggregatePreviousMonth.submittedVideos,
        aggregatePreviousMonth.targetVideos,
      )
    : null;

  const avgSixMo =
    revenueSeries.length > 0
      ? revenueSeries.reduce((a, p) => a + p.value, 0) / revenueSeries.length
      : 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "sheet-content fixed inset-y-0 right-0 z-[95] flex w-full max-w-md flex-col border-l border-white/10 bg-[#070c18]/95 shadow-2xl backdrop-blur-xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300",
          )}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Creator profile
              </p>
              <p className="text-lg font-semibold text-foreground">
                {creator.name}
              </p>
            </div>
            <DialogPrimitive.Close className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/40">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-neon-cyan/30 shadow-[0_0_30px_rgba(50,230,255,0.2)]">
                {hasAvatar ? (
                  <Image
                    src={avatarSrc}
                    alt={creator.name}
                    width={64}
                    height={64}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 text-2xl font-bold text-foreground/80"
                    aria-hidden
                  >
                    {(creator.name.trim().slice(0, 1) || "?").toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-2">
                <p className="truncate text-sm text-neon-cyan">
                  {creator.handleTikTok}
                </p>
                <CreatorTypeChip type={creator.creatorType} />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Bulan berjalan (sesuai filter meja)
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Target
                  </p>
                  <p className="font-mono text-lg text-foreground">
                    {aggregate.targetVideos}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Submitted
                  </p>
                  <p className="font-mono text-lg text-foreground">
                    {aggregate.submittedVideos}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Actual profit
                  </p>
                  <p className="text-xl font-semibold text-neon-cyan">
                    {formatCurrency(aggregate.actualProfit)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Expected revenue (6 bulan)
              </p>
              {chartPoints.length >= 2 ? (
                <MiniRevenueAreaChart
                  points={chartPoints}
                  ariaLabel={`Trend expected revenue enam bulan untuk ${creator.name}`}
                  height={160}
                  reducedMotion={reducedMotion}
                />
              ) : (
                <p className="text-sm text-muted">
                  Data per bulan belum cukup untuk grafik.
                </p>
              )}
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Konteks
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li className="flex justify-between gap-3">
                  <span>
                    {prevLabel} (submit vs target)
                  </span>
                  <span className="shrink-0 font-mono text-foreground/90">
                    {aggregatePreviousMonth ? (
                      <>
                        {aggregatePreviousMonth.submittedVideos} /{" "}
                        {aggregatePreviousMonth.targetVideos}
                        <span className="text-neon-cyan/90">
                          {" "}
                          (
                          {(
                            lastMoCompletion ?? 0
                          ).toFixed(0)}
                          %)
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Rata-rata ER (6 bln)</span>
                  <span className="shrink-0 font-mono text-foreground/90">
                    {avgSixMo > 0 ? formatCurrency(avgSixMo) : "—"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
