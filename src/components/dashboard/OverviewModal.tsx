"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { TotalRow } from "@/hooks/useCreatorDashboard";
import { MiniRevenueAreaChart } from "@/components/dashboard/MiniRevenueAreaChart";
import { cn, formatCurrency, labelMonth } from "@/lib/utils";

interface OverviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
  /** Total footer tabel (filter header + chip segmen). */
  tableTotal: TotalRow | null;
  tableTotalPreviousMonth: TotalRow | null;
  previousMonthKey: string;
  sparkline: { monthKey: string; targetRevenue: number }[];
}

function useCountUpOnMount(
  target: number,
  reducedMotion: boolean,
  durationMs: number,
) {
  const [v, setV] = useState(() => (reducedMotion ? target : 0));

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let start: number | null = null;
    let raf = 0;

    const step = (now: number) => {
      if (cancelled) return;
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(() => {
      if (cancelled) return;
      setV(0);
      raf = requestAnimationFrame(step);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target, reducedMotion, durationMs]);

  return reducedMotion ? target : v;
}

function monthOverMonthHintGeneric(
  current: number,
  previous: number,
  previousLabel: string,
  entityShortLabel: string,
): { line: string; tone: "up" | "down" | "flat" | "new" } {
  if (previous <= 0 && current <= 0) {
    return {
      line: `vs ${previousLabel}: belum ada ${entityShortLabel}.`,
      tone: "flat",
    };
  }
  if (previous <= 0 && current > 0) {
    return {
      line: `vs ${previousLabel}: bulan lalu Rp 0 — mulai ada ${entityShortLabel}.`,
      tone: "new",
    };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) {
    return { line: `vs ${previousLabel}: stabil (~0%).`, tone: "flat" };
  }
  if (pct > 0) {
    return {
      line: `vs ${previousLabel}: naik ${pct.toFixed(1)}%.`,
      tone: "up",
    };
  }
  return {
    line: `vs ${previousLabel}: turun ${Math.abs(pct).toFixed(1)}%.`,
    tone: "down",
  };
}

function OverviewFigures({
  tableTotal,
  tableTotalPreviousMonth,
  reducedMotion,
  previousMonthKey,
  sparkline,
}: {
  tableTotal: TotalRow | null;
  tableTotalPreviousMonth: TotalRow | null;
  reducedMotion: boolean;
  previousMonthKey: string;
  sparkline: { monthKey: string; targetRevenue: number }[];
}) {
  const expRev = tableTotal?.expectedRevenue ?? 0;
  const tnc = tableTotal?.tncExpectedProfit ?? 0;
  const hnd = tableTotal?.hndExpectedProfit ?? 0;

  const prevExp = tableTotalPreviousMonth?.expectedRevenue ?? 0;
  const prevTnc = tableTotalPreviousMonth?.tncExpectedProfit ?? 0;
  const prevHnd = tableTotalPreviousMonth?.hndExpectedProfit ?? 0;

  const expA = useCountUpOnMount(expRev, reducedMotion, 340);
  const tncA = useCountUpOnMount(tnc, reducedMotion, 380);
  const hndA = useCountUpOnMount(hnd, reducedMotion, 400);

  const prevLabel = labelMonth(previousMonthKey);
  const momEr = monthOverMonthHintGeneric(
    expRev,
    prevExp,
    prevLabel,
    "expected revenue",
  );
  const momTnc = monthOverMonthHintGeneric(
    tnc,
    prevTnc,
    prevLabel,
    "[TNC] exp. profit",
  );
  const momHnd = monthOverMonthHintGeneric(
    hnd,
    prevHnd,
    prevLabel,
    "[HND] exp. profit",
  );

  const areaPoints =
    sparkline.length >= 2
      ? sparkline.map((p) => ({
          monthKey: p.monthKey,
          value: p.targetRevenue,
        }))
      : [];

  const noRows = !tableTotal;

  return (
    <div className="grid gap-4 pt-2">
      {areaPoints.length >= 2 ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Trend expected revenue (6 bulan)
          </p>
          <MiniRevenueAreaChart
            points={areaPoints}
            ariaLabel="Grafik area expected revenue enam bulan terakhir sesuai filter tabel"
            height={168}
            reducedMotion={reducedMotion}
          />
        </div>
      ) : null}
      {noRows ? (
        <p className="text-sm text-muted">
          Tidak ada baris di tabel untuk kombinasi bulan dan filter saat ini —
          angka ringkas di bawah adalah Rp 0.
        </p>
      ) : null}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Expected revenue
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
          {formatCurrency(expA)}
        </p>
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            momEr.tone === "up" && "text-emerald-400/95",
            momEr.tone === "down" && "text-amber-300/95",
            momEr.tone === "flat" && "text-muted",
            momEr.tone === "new" && "text-neon-cyan/90",
          )}
        >
          {momEr.line}
        </p>
        <p className="mt-2 text-xs text-muted">
          Sama dengan total kolom <strong className="font-medium text-foreground/80">Expected revenue</strong>{" "}
          pada footer tabel (filter creator/brand + chip segmen).
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          [TNC] Exp. profit
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-neon-cyan">
          {formatCurrency(tncA)}
        </p>
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            momTnc.tone === "up" && "text-emerald-400/95",
            momTnc.tone === "down" && "text-amber-300/95",
            momTnc.tone === "flat" && "text-muted",
            momTnc.tone === "new" && "text-neon-cyan/90",
          )}
        >
          {momTnc.line}
        </p>
        <p className="mt-2 text-xs text-muted">
          Sama dengan total kolom{" "}
          <strong className="font-medium text-neon-cyan/90">[TNC] Exp. profit</strong> pada
          footer tabel.
        </p>
      </div>
      <div className="rounded-xl border border-neon-purple/25 bg-neon-purple/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          [HND] Exp. profit
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-neon-purple">
          {formatCurrency(hndA)}
        </p>
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            momHnd.tone === "up" && "text-emerald-400/95",
            momHnd.tone === "down" && "text-amber-300/95",
            momHnd.tone === "flat" && "text-muted",
            momHnd.tone === "new" && "text-neon-cyan/90",
          )}
        >
          {momHnd.line}
        </p>
        <p className="mt-2 text-xs text-muted">
          Sama dengan total kolom{" "}
          <strong className="font-medium text-neon-purple/90">[HND] Exp. profit</strong> pada
          footer (agregasi % Hanindo per creator pada baris yang tampil).
        </p>
      </div>
    </div>
  );
}

export function OverviewModal({
  open,
  onOpenChange,
  monthKey,
  tableTotal,
  tableTotalPreviousMonth,
  previousMonthKey,
  sparkline,
}: OverviewModalProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-neon-cyan/20">
        <DialogHeader>
          <DialogTitle>Overview</DialogTitle>
          <DialogDescription>
            Ringkasan untuk{" "}
            <span className="font-medium text-foreground">
              {labelMonth(monthKey)}
            </span>
            . Ketiga angka utama menyamai{" "}
            <span className="font-medium text-foreground">footer baris Total</span>{" "}
            pada tabel performa — termasuk filter creator/brand di header dan{" "}
            <span className="font-medium text-foreground">quick filter chip</span>{" "}
            segmen meja.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <OverviewFigures
            key={`${monthKey}-${tableTotal?.expectedRevenue ?? "empty"}`}
            tableTotal={tableTotal}
            tableTotalPreviousMonth={tableTotalPreviousMonth}
            reducedMotion={reducedMotion}
            previousMonthKey={previousMonthKey}
            sparkline={sparkline}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
