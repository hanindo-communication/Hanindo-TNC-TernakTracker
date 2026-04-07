"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
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
import { WeeklySubmittedInfographicChart } from "@/components/dashboard/WeeklySubmittedInfographicChart";
import { fetchWeeklyProgressDocument } from "@/lib/dashboard/supabase-data";
import {
  buildStackedSubmittedChartData,
  weekSubmittedTotals as computeWeekSubmittedTotals,
} from "@/lib/dashboard/weekly-progress-chart-data";
import {
  loadRowsFromStorage,
  parseV2,
  type WeeklyProgressRow,
  WEEKS,
} from "@/lib/dashboard/weekly-progress-storage";
import {
  formatSupabaseClientError,
  supabaseErrorDebugPayload,
} from "@/lib/supabase/format-client-error";
import { applyWeeklyTargetsHydration } from "@/lib/dashboard/weekly-progress-mirror-submitted";
import type { Creator, CreatorTarget, Project } from "@/lib/types";
import { cn, formatCurrency, labelMonth } from "@/lib/utils";

interface OverviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
  /** Sumber nama baris weekly (sama dengan workspace campaigns). */
  campaignOptions: { id: string; name: string }[];
  /** Selaraskan angka submitted weekly dengan breakdown. */
  targets: CreatorTarget[];
  creators: Creator[];
  projects: Project[];
  /** Untuk memuat weekly progress bersama; tanpa ini hanya localStorage. */
  supabase?: SupabaseClient | null;
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

function OverviewWeeklyProgressSection({
  open,
  monthKey,
  supabase,
  campaignOptions,
  targets,
  creators,
  projects,
  reducedMotion,
}: {
  open: boolean;
  monthKey: string;
  supabase: SupabaseClient | null;
  campaignOptions: { id: string; name: string }[];
  targets: CreatorTarget[];
  creators: Creator[];
  projects: Project[];
  reducedMotion: boolean;
}) {
  const [rows, setRows] = useState<WeeklyProgressRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  /** `'all'` atau indeks minggu 0..WEEKS-1 untuk grafik submitted. */
  const [submittedWeekFilter, setSubmittedWeekFilter] = useState<
    "all" | number
  >("all");

  useEffect(() => {
    if (!open) {
      setRows(null);
      setFetchErr(null);
      setSubmittedWeekFilter("all");
      return;
    }
    let cancelled = false;
    setBusy(true);
    setFetchErr(null);
    void (async () => {
      try {
        const doc = supabase
          ? await fetchWeeklyProgressDocument(supabase, monthKey)
          : null;
        const parsed = doc !== null ? parseV2(doc) : null;
        const next = parsed ?? loadRowsFromStorage(monthKey);
        if (!cancelled) setRows(next);
      } catch (e) {
        if (!cancelled) {
          setFetchErr(formatSupabaseClientError(e));
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[OverviewModal weekly]",
              supabaseErrorDebugPayload(e),
            );
          }
          setRows(loadRowsFromStorage(monthKey));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, monthKey, supabase]);

  const nameByProjectId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of campaignOptions) m.set(o.id, o.name);
    return m;
  }, [campaignOptions]);

  const chartWeekIndices = useMemo(() => {
    if (submittedWeekFilter === "all") {
      return Array.from({ length: WEEKS }, (_, i) => i);
    }
    return [submittedWeekFilter];
  }, [submittedWeekFilter]);

  const rowsForChart = useMemo(() => {
    if (!rows) return null;
    if (!targets.length) return rows;
    return applyWeeklyTargetsHydration({
      rows,
      monthKey,
      targets,
      creators,
      projects,
      campaignOptions,
    });
  }, [rows, monthKey, targets, creators, projects, campaignOptions]);

  const { data: stackedData, campaignKeys } = useMemo(() => {
    if (!rowsForChart) return { data: [], campaignKeys: [] as string[] };
    return buildStackedSubmittedChartData(
      rowsForChart,
      chartWeekIndices,
      monthKey,
      nameByProjectId,
    );
  }, [rowsForChart, monthKey, nameByProjectId, chartWeekIndices]);

  const weekTotals = useMemo(
    () =>
      rowsForChart ? computeWeekSubmittedTotals(rowsForChart) : [0, 0, 0, 0],
    [rowsForChart],
  );

  const sumWeek = weekTotals.reduce((a, b) => a + b, 0);

  if (!open) return null;

  return (
    <div className="grid gap-3 border-b border-white/10 pb-4 pt-1">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Weekly progress — submitted video
        </p>
        <p className="mt-1 text-xs text-muted">
          Sumber: modal Weekly progress untuk{" "}
          <span className="font-medium text-foreground/85">
            {labelMonth(monthKey)}
          </span>
          {supabase ? " (peramban + cloud)." : " (peramban)."}
        </p>
      </div>
      {busy || rows === null ? (
        <p className="text-sm text-muted">Memuat data weekly…</p>
      ) : (
        <>
          {fetchErr ? (
            <p className="text-xs text-amber-300/90">
              Cloud weekly tidak dimuat; menampilkan cache peramban.{" "}
              <span className="text-muted">{fetchErr}</span>
            </p>
          ) : null}
          <p className="text-xs font-medium text-foreground/90">
            Total submitted (bulan ini):{" "}
            <span className="tabular-nums text-neon-cyan">{sumWeek}</span>
            <span className="ml-2 text-muted">
              (W1: {weekTotals[0] ?? 0} · W2: {weekTotals[1] ?? 0} · W3:{" "}
              {weekTotals[2] ?? 0} · W4: {weekTotals[3] ?? 0})
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Filter minggu (grafik)
            </p>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Pilih minggu untuk grafik submitted video"
            >
              <button
                type="button"
                onClick={() => setSubmittedWeekFilter("all")}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition focus:outline-none focus:ring-2 focus:ring-neon-cyan/35",
                  submittedWeekFilter === "all"
                    ? "border-neon-cyan/45 bg-neon-cyan/15 text-neon-cyan"
                    : "border-white/10 bg-white/[0.04] text-muted hover:border-white/18 hover:text-foreground/85",
                )}
              >
                Semua
              </button>
              {Array.from({ length: WEEKS }, (_, w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSubmittedWeekFilter(w)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition focus:outline-none focus:ring-2 focus:ring-neon-cyan/35",
                    submittedWeekFilter === w
                      ? "border-neon-cyan/45 bg-neon-cyan/15 text-neon-cyan"
                      : "border-white/10 bg-white/[0.04] text-muted hover:border-white/18 hover:text-foreground/85",
                  )}
                >
                  Week {w + 1}
                </button>
              ))}
            </div>
          </div>
          <WeeklySubmittedInfographicChart
            data={stackedData}
            campaignKeys={campaignKeys}
            height={200}
            reducedMotion={reducedMotion}
            ariaLabel={`Submitted video per minggu per campaign untuk ${labelMonth(monthKey)}${
              submittedWeekFilter === "all"
                ? ""
                : ` — filter Week ${submittedWeekFilter + 1}`
            }`}
          />
        </>
      )}
    </div>
  );
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
  campaignOptions,
  targets,
  creators,
  projects,
  supabase = null,
  tableTotal,
  tableTotalPreviousMonth,
  previousMonthKey,
  sparkline,
}: OverviewModalProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-neon-cyan/20">
        <DialogHeader>
          <DialogTitle>Overview</DialogTitle>
          <DialogDescription>
            Ringkasan untuk{" "}
            <span className="font-medium text-foreground">
              {labelMonth(monthKey)}
            </span>
            : angka keuangan mengikuti{" "}
            <span className="font-medium text-foreground">footer Total</span>{" "}
            tabel (filter + chip segmen), dan grafik weekly mengikuti isian{" "}
            <span className="font-medium text-foreground">Weekly progress</span>.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <div className="grid gap-2">
            <OverviewWeeklyProgressSection
              open={open}
              monthKey={monthKey}
              supabase={supabase ?? null}
              campaignOptions={campaignOptions}
              targets={targets}
              creators={creators}
              projects={projects}
              reducedMotion={reducedMotion}
            />
            <OverviewFigures
              key={`${monthKey}-${tableTotal?.expectedRevenue ?? "empty"}`}
              tableTotal={tableTotal}
              tableTotalPreviousMonth={tableTotalPreviousMonth}
              reducedMotion={reducedMotion}
              previousMonthKey={previousMonthKey}
              sparkline={sparkline}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
