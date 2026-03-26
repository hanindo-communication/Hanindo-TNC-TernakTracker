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
import { formatCurrency, labelMonth } from "@/lib/utils";

export interface OverviewStats {
  targetRevenue: number;
  /** 50% × revenue TNC + 100% × revenue FOLO (expected revenue per segmen). */
  actualRevenue: number;
  /** 15% × total expected revenue segmen TNC Hanindo Ternak. */
  hanindoSharingTotal: number;
  tncSegmentRevenue: number;
  foloSegmentRevenue: number;
  /** Segmen kolom Table = All (belum ditempatkan ke meja TNC/FOLO). */
  allSegmentRevenue: number;
}

interface OverviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
  stats: OverviewStats | null;
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

function OverviewFigures({
  stats,
  reducedMotion,
}: {
  stats: OverviewStats;
  reducedMotion: boolean;
}) {
  const tr = stats.targetRevenue;
  const ar = stats.actualRevenue;
  const hst = stats.hanindoSharingTotal;
  const tnc = stats.tncSegmentRevenue;
  const folo = stats.foloSegmentRevenue;
  const allSeg = stats.allSegmentRevenue;

  const trA = useCountUpOnMount(tr, reducedMotion, 340);
  const arA = useCountUpOnMount(ar, reducedMotion, 380);
  const hstA = useCountUpOnMount(hst, reducedMotion, 400);
  const tncA = useCountUpOnMount(tnc, reducedMotion, 320);
  const foloA = useCountUpOnMount(folo, reducedMotion, 320);
  const allSegA = useCountUpOnMount(allSeg, reducedMotion, 320);

  return (
    <div className="grid gap-4 pt-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Target revenue
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
          {formatCurrency(trA)}
        </p>
        <p className="mt-2 text-xs text-muted">
          TNC {formatCurrency(tncA)} + FOLO {formatCurrency(foloA)}
          {allSeg > 0 ? ` + All Creators ${formatCurrency(allSegA)}` : ""}.
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Actual revenue
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-neon-cyan">
          {formatCurrency(arA)}
        </p>
        <p className="mt-2 text-xs text-muted">
          50% dari total revenue TNC Hanindo Ternak + 100% dari total revenue FOLO
          Ternak ({formatCurrency(0.5 * tnc)} + {formatCurrency(folo)}).
        </p>
      </div>
      <div className="rounded-xl border border-neon-purple/25 bg-neon-purple/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Hanindo sharing total
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-neon-purple">
          {formatCurrency(hstA)}
        </p>
        <p className="mt-2 text-xs text-muted">
          15% × total revenue TNC Hanindo Ternak ({formatCurrency(tnc)} × 15%).
        </p>
      </div>
    </div>
  );
}

const EMPTY_STATS: OverviewStats = {
  targetRevenue: 0,
  actualRevenue: 0,
  hanindoSharingTotal: 0,
  tncSegmentRevenue: 0,
  foloSegmentRevenue: 0,
  allSegmentRevenue: 0,
};

export function OverviewModal({
  open,
  onOpenChange,
  monthKey,
  stats,
}: OverviewModalProps) {
  const reducedMotion = usePrefersReducedMotion();
  const s = stats ?? EMPTY_STATS;

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
            . Angka memakai{" "}
            <span className="font-medium text-foreground">
              total revenue (expected)
            </span>{" "}
            per segmen meja{" "}
            <span className="font-medium text-foreground">
              TNC Hanindo Ternak
            </span>{" "}
            dan{" "}
            <span className="font-medium text-foreground">FOLO Ternak</span>,
            mengikuti filter creator &amp; brand di header (bukan quick filter chip
            di tabel).
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <OverviewFigures
            key={monthKey}
            stats={s}
            reducedMotion={reducedMotion}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
