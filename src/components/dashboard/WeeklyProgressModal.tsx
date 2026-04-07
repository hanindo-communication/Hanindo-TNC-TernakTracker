"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Check,
  Copy,
  GripVertical,
  Loader2,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchWeeklyProgressDocument,
  persistWeeklyProgressDocument,
} from "@/lib/dashboard/supabase-data";
import {
  formatSupabaseClientError,
  supabaseErrorDebugPayload,
} from "@/lib/supabase/format-client-error";
import { cn, labelMonth } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { WeeklySubmittedInfographicChart } from "@/components/dashboard/WeeklySubmittedInfographicChart";
import { toast } from "sonner";
import { AppSelect } from "@/components/ui/app-select";
import {
  buildStackedSubmittedChartData,
  weekSubmittedTotals as computeWeekSubmittedTotals,
} from "@/lib/dashboard/weekly-progress-chart-data";
import {
  applyWeeklyTargetsHydration,
  hydrateWeeklyRowsSubmittedFromTargets,
} from "@/lib/dashboard/weekly-progress-mirror-submitted";
import {
  campaignLabelFromRow,
  defaultRows,
  duplicateRowFields,
  emptyRow,
  ensureWeekCoverage,
  getWeekRangeLabelsInMonth,
  insertRowAfter,
  insertRowInWeek,
  loadRowsFromStorage,
  parseV2,
  reorderWithinWeek,
  saveRowsToLocalStorage,
  type WeeklyProgressRow,
  WEEKS,
} from "@/lib/dashboard/weekly-progress-storage";
import type { Creator, CreatorTarget, Project } from "@/lib/types";

export type { WeeklyProgressRow };

const WEEKLY_ROW_DRAG_TYPE = "application/tnc-weekly-row";

const inputClass =
  "h-9 w-full min-w-[6rem] rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-neon-cyan/55 focus:ring-2 focus:ring-neon-cyan/20";

const weeklyCampaignSelectClass =
  "h-9 min-w-0 border-white/10 bg-white/[0.04] px-2 text-sm shadow-none hover:border-white/15 focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25";

const EMPTY_DRAFT: WeeklyProgressRow = {
  id: "",
  weekIndex: 0,
  creatorName: "",
  campaignName: "",
  campaignProjectId: undefined,
  linkedCreatorTargetId: undefined,
  targetVideoSubmit: "",
  targetReqAnotherCreative: "",
  targetApplyCampaign: "",
  submittedVideo: "",
};

interface WeeklyProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
  /** Daftar campaign workspace (sama seperti Data settings / Submit Targets). */
  campaignOptions: { id: string; name: string }[];
  /** Untuk mirror kolom Submitted dari breakdown / `creator_targets`. */
  targets: CreatorTarget[];
  creators: Creator[];
  projects: Project[];
  /** Bila diisi, data dimuat/disimpan ke Supabase (workspace bersama) selain localStorage. */
  supabase?: SupabaseClient | null;
}

function resolveCampaignProjectIdFromName(
  campaignName: string,
  options: { id: string; name: string }[],
): string | undefined {
  const t = campaignName.trim().toLowerCase();
  if (!t) return undefined;
  const hit = options.find((o) => o.name.trim().toLowerCase() === t);
  return hit?.id;
}

export function WeeklyProgressModal({
  open,
  onOpenChange,
  monthKey,
  campaignOptions,
  targets,
  creators,
  projects,
  supabase = null,
}: WeeklyProgressModalProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [rows, setRows] = useState<WeeklyProgressRow[]>(defaultRows);
  const [weekTableFilter, setWeekTableFilter] = useState<
    "all" | 0 | 1 | 2 | 3
  >("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WeeklyProgressRow>({ ...EMPTY_DRAFT });
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [cloudFetchError, setCloudFetchError] = useState<string | null>(null);
  /** null = belum selesai fetch; false = tidak ada baris di Supabase untuk bulan ini; true = ada dokumen cloud */
  const [hasRemoteRow, setHasRemoteRow] = useState<boolean | null>(null);
  /** Sampai selesai fetch pertama dari Supabase — hindari flash baris default / localStorage lawas */
  const [cloudHydrating, setCloudHydrating] = useState(false);

  useEffect(() => {
    if (!open) {
      setHasRemoteRow(null);
      setCloudFetchError(null);
      setCloudHydrating(false);
      setWeekTableFilter("all");
    }
  }, [open]);

  const mirrorRowsToLocalStorage = useCallback((next: WeeklyProgressRow[]) => {
    saveRowsToLocalStorage(monthKey, next);
  }, [monthKey]);

  /**
   * Selalu gunakan snapshot `targets` / entitas terbaru saat merge (mis. setelah fetch cloud selesai),
   * tanpa mengikat ulang effect muat modal ke setiap perubahan targets — itu memicu refetch & reset baris.
   * Kolom Submitted tetap mengikuti meja performa lewat `rowsLive` + ref ini saat merge.
   */
  const weeklyHydrateRef = useRef({
    targets,
    creators,
    projects,
    campaignOptions,
    monthKey,
  });
  weeklyHydrateRef.current = {
    targets,
    creators,
    projects,
    campaignOptions,
    monthKey,
  };

  const mergeLoadedIntoState = useCallback(
    (base: WeeklyProgressRow[]) => {
      const {
        targets: t,
        creators: c,
        projects: p,
        campaignOptions: co,
        monthKey: mk,
      } = weeklyHydrateRef.current;
      const merged =
        t.length > 0
          ? applyWeeklyTargetsHydration({
              rows: base,
              monthKey: mk,
              targets: t,
              creators: c,
              projects: p,
              campaignOptions: co,
            })
          : base;
      setRows(merged);
      mirrorRowsToLocalStorage(merged);
    },
    [mirrorRowsToLocalStorage],
  );

  const nameByProjectId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of campaignOptions) m.set(o.id, o.name);
    return m;
  }, [campaignOptions]);

  const rowsLive = useMemo(
    () =>
      targets.length > 0
        ? hydrateWeeklyRowsSubmittedFromTargets({
            rows,
            monthKey,
            targets,
            creators,
            campaignOptions,
          })
        : rows,
    [rows, monthKey, targets, creators, campaignOptions],
  );

  const draftSubmittedMirror = useMemo(() => {
    if (!editingId || !targets.length) return "";
    const snap: WeeklyProgressRow = {
      ...draft,
      id: draft.id || "draft",
      weekIndex: draft.weekIndex,
    };
    const [one] = hydrateWeeklyRowsSubmittedFromTargets({
      rows: [snap],
      monthKey,
      targets,
      creators,
      campaignOptions,
    });
    return one?.submittedVideo ?? "0";
  }, [editingId, draft, monthKey, targets, creators, campaignOptions]);

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
    setDragRowId(null);
    setDragOverRowId(null);
    setCloudFetchError(null);
    setHasRemoteRow(null);

    if (supabase) {
      let cancelled = false;
      setCloudHydrating(true);
      void (async () => {
        try {
          const doc = await fetchWeeklyProgressDocument(supabase, monthKey);
          if (cancelled) return;
          setHasRemoteRow(doc !== null);
          const parsed = doc ? parseV2(doc) : null;
          if (parsed) {
            mergeLoadedIntoState(parsed);
            return;
          }
          if (doc !== null && !parsed) {
            toast.error(
              "Weekly progress di cloud rusak atau tidak dikenali. Data peramban tidak dipakai agar tidak tertukar.",
            );
            mergeLoadedIntoState(defaultRows());
            return;
          }
        } catch (e) {
          const msg = formatSupabaseClientError(e);
          setCloudFetchError(msg);
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[WeeklyProgress] fetch remote",
              supabaseErrorDebugPayload(e),
            );
          }
          toast.error("Gagal memuat weekly progress dari cloud", {
            description: msg,
          });
          if (!cancelled) mergeLoadedIntoState(loadRowsFromStorage(monthKey));
          return;
        }
        if (!cancelled) mergeLoadedIntoState(loadRowsFromStorage(monthKey));
      })().finally(() => {
        if (!cancelled) setCloudHydrating(false);
      });
      return () => {
        cancelled = true;
      };
    }

    setHasRemoteRow(null);
    setCloudHydrating(false);
    mergeLoadedIntoState(loadRowsFromStorage(monthKey));
  }, [open, monthKey, supabase, mergeLoadedIntoState]);

  const persist = useCallback(
    (next: WeeklyProgressRow[]) => {
      const merged =
        targets.length > 0
          ? hydrateWeeklyRowsSubmittedFromTargets({
              rows: next,
              monthKey,
              targets,
              creators,
              campaignOptions,
            })
          : next;
      setRows(merged);
      mirrorRowsToLocalStorage(merged);
      if (supabase) {
        void persistWeeklyProgressDocument(supabase, monthKey, {
          version: 2,
          rows: merged,
        }).catch((e) => {
          toast.error("Gagal simpan weekly progress ke cloud", {
            description: formatSupabaseClientError(e),
          });
        });
      }
    },
    [
      monthKey,
      supabase,
      mirrorRowsToLocalStorage,
      targets,
      creators,
      campaignOptions,
    ],
  );

  const handleSaveAll = useCallback(async () => {
    const mergedEditing: WeeklyProgressRow[] =
      editingId !== null
        ? rows.map((r) =>
            r.id === editingId
              ? {
                  ...draft,
                  id: r.id,
                  weekIndex: r.weekIndex,
                  linkedCreatorTargetId: r.linkedCreatorTargetId,
                  submittedVideo: r.submittedVideo,
                }
              : r,
          )
        : rows;

    const next: WeeklyProgressRow[] =
      targets.length > 0
        ? applyWeeklyTargetsHydration({
            rows: mergedEditing,
            monthKey,
            targets,
            creators,
            projects,
            campaignOptions,
          })
        : mergedEditing;

    setRows(next);
    mirrorRowsToLocalStorage(next);

    if (editingId !== null) {
      setEditingId(null);
      setDraft({ ...EMPTY_DRAFT });
    }

    if (!supabase) {
      toast.success("Progress disimpan di peramban");
      return;
    }

    setSavingAll(true);
    try {
      await persistWeeklyProgressDocument(supabase, monthKey, {
        version: 2,
        rows: next,
      });
      const doc = await fetchWeeklyProgressDocument(supabase, monthKey);
      setHasRemoteRow(doc !== null);
      const parsed = doc ? parseV2(doc) : null;
      if (parsed) {
        const fixed =
          targets.length > 0
            ? applyWeeklyTargetsHydration({
                rows: parsed,
                monthKey,
                targets,
                creators,
                projects,
                campaignOptions,
              })
            : parsed;
        setRows(fixed);
        mirrorRowsToLocalStorage(fixed);
      }
      toast.success("Tersimpan & disinkronkan ke cloud", {
        description:
          "Data tim diperbarui; tampilan ini diselaraskan dengan server.",
      });
    } catch (e) {
      toast.error("Gagal menyimpan / sinkron weekly progress", {
        description: formatSupabaseClientError(e),
      });
    } finally {
      setSavingAll(false);
    }
  }, [
    rows,
    editingId,
    draft,
    monthKey,
    supabase,
    mirrorRowsToLocalStorage,
    targets,
    creators,
    projects,
    campaignOptions,
  ]);

  const rowsByWeek = useMemo(() => {
    const m = new Map<number, WeeklyProgressRow[]>();
    for (let w = 0; w < WEEKS; w++) m.set(w, []);
    for (const r of rowsLive) {
      const w = r.weekIndex;
      if (w >= 0 && w < WEEKS) {
        m.get(w)!.push(r);
      }
    }
    return m;
  }, [rowsLive]);

  const startEdit = (row: WeeklyProgressRow) => {
    let next = { ...row };
    if (!next.campaignProjectId?.trim() && next.campaignName.trim()) {
      const pid = resolveCampaignProjectIdFromName(
        next.campaignName,
        campaignOptions,
      );
      if (pid) next = { ...next, campaignProjectId: pid };
    }
    setDraft(next);
    setEditingId(row.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
  };

  const confirmEdit = () => {
    if (!editingId) return;
    const next = rows.map((r) =>
      r.id === editingId
        ? {
            ...draft,
            id: r.id,
            weekIndex: r.weekIndex,
            linkedCreatorTargetId: r.linkedCreatorTargetId,
            submittedVideo: r.submittedVideo,
          }
        : r,
    );
    persist(next);
    cancelEdit();
  };

  const addRowForWeek = (weekIndex: number) => {
    const row = emptyRow(weekIndex);
    persist(insertRowInWeek(rows, row));
  };

  const removeRow = (id: string) => {
    if (!rows.some((r) => r.id === id)) return;
    if (editingId === id) cancelEdit();
    persist(ensureWeekCoverage(rows.filter((r) => r.id !== id)));
  };

  const confirmClearMonth = () => {
    if (
      !window.confirm(
        "Kosongkan semua weekly progress untuk bulan ini? Empat minggu diisi ulang dengan baris kosong (cloud ikut diperbarui jika login).",
      )
    ) {
      return;
    }
    persist(defaultRows());
    toast.success("Weekly progress dikosongkan", {
      description: `Bulan ${labelMonth(monthKey)} — silakan isi ulang atau sinkron dari tabel performa (kolom Week).`,
    });
  };

  const duplicateRow = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const clone = duplicateRowFields(row);
    persist(insertRowAfter(rows, id, clone));
  };

  const monthLabel = useMemo(() => labelMonth(monthKey), [monthKey]);
  const weekRangesInMonth = useMemo(
    () => getWeekRangeLabelsInMonth(monthKey),
    [monthKey],
  );

  const chartWeekIndices = useMemo(
    () =>
      weekTableFilter === "all"
        ? [0, 1, 2, 3]
        : [weekTableFilter],
    [weekTableFilter],
  );

  const weekSubmittedTotals = useMemo(
    () => computeWeekSubmittedTotals(rowsLive),
    [rowsLive],
  );

  const { data: stackedChartData, campaignKeys: stackedChartCampaignKeys } =
    useMemo(
      () =>
        buildStackedSubmittedChartData(
          rowsLive,
          chartWeekIndices,
          monthKey,
          nameByProjectId,
        ),
      [rowsLive, chartWeekIndices, monthKey, nameByProjectId],
    );

  const visibleWeekIndices = useMemo(
    () =>
      weekTableFilter === "all"
        ? [0, 1, 2, 3]
        : [weekTableFilter],
    [weekTableFilter],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,900px)] min-h-0 max-w-[min(100vw-1.5rem,80rem)] flex-col gap-0 overflow-hidden border-neon-cyan/20 p-0 sm:rounded-2xl"
        showClose
      >
        <DialogHeader className="shrink-0 border-b border-white/[0.07] px-5 py-4 pr-14">
          <div className="flex flex-col gap-3">
            <div className="flex flex-row items-start justify-between gap-3">
              <DialogTitle className="min-w-0 flex-1 pr-2 text-left text-lg font-semibold leading-snug text-foreground">
                Weekly progress
                <span className="ml-2 text-base font-normal text-muted">
                  · {monthLabel}
                </span>
              </DialogTitle>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={confirmClearMonth}
                  disabled={savingAll || cloudHydrating}
                  title="Hapus semua isian bulan ini dan isi ulang empat minggu dengan baris kosong"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/18 bg-white/[0.06] px-3 text-sm font-semibold text-foreground/90 transition hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-white/25 disabled:pointer-events-none disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">Kosongkan bulan</span>
                  <span className="sm:hidden">Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveAll()}
                  disabled={savingAll || cloudHydrating}
                  title={
                    supabase
                      ? "Simpan ke cloud lalu selaraskan tampilan dengan data terbaru di server"
                      : undefined
                  }
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-400/45 bg-emerald-500/20 px-3 text-sm font-semibold text-emerald-100 shadow-sm transition hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:pointer-events-none disabled:opacity-60 sm:px-4"
                >
                  {savingAll ? (
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <Save className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <span className="whitespace-nowrap">
                    {savingAll
                      ? supabase
                        ? "Menyimpan & sinkron…"
                        : "Menyimpan…"
                      : "Simpan"}
                  </span>
                </button>
              </div>
            </div>
            <DialogDescription className="text-sm text-muted">
              <span className="font-medium text-foreground/85">{monthLabel}</span>
              {" — "}
              Empat minggu mengikuti tanggal dalam bulan (WIB). Tiap minggu
              dimulai dengan satu baris; tambah baris bila beberapa creator /
              campaign. Data{" "}
              <strong className="font-semibold text-foreground/90">
                hanya untuk bulan ini
              </strong>
              . Edit per baris lalu Konfirmasi atau Batal, atau tekan{" "}
              <strong className="font-semibold text-foreground/90">Simpan</strong>{" "}
              di atas untuk menyimpan semua sekaligus (termasuk baris yang sedang
              diedit) ke peramban
              {supabase ? " dan ke cloud" : ""}.
              {supabase
                ? " Satu tombol Simpan mengunggah ke Supabase dan menyelaraskan tampilan dengan data terbaru di server."
                : ""}{" "}
              Urutan dalam minggu sama bisa diubah dengan menyeret ikon grip di
              kiri baris.{" "}
              <span className="text-foreground/80">
                Kolom <strong className="font-semibold">Submitted</strong>{" "}
                otomatis naik/turun mengikuti penambahan atau penghapusan URL
                valid di tabel performa (minggu ditentukan dari tanggal hari ini,
                zona Asia/Jakarta).
              </span>
            </DialogDescription>
            {cloudFetchError ? (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-red-400/35 bg-red-500/15 px-3 py-2 text-sm text-red-100"
              >
                <span className="font-semibold">Cloud tidak bisa dimuat.</span>{" "}
                {cloudFetchError} Pastikan migrasi database untuk weekly
                progress sudah dijalankan (
                <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
                  supabase/migrations/012_weekly_progress_shared_workspace.sql
                </code>
                ).
              </div>
            ) : null}
            {supabase &&
            hasRemoteRow === false &&
            !cloudFetchError ? (
              <div
                role="status"
                className="mt-3 rounded-lg border border-amber-400/35 bg-amber-500/12 px-3 py-2 text-sm text-amber-50"
              >
                <span className="font-semibold text-amber-100">
                  Belum ada data weekly progress di Supabase untuk bulan ini.
                </span>{" "}
                Yang tampil sekarang dari peramban perangkat ini saja. Agar
                semua orang melihat isian yang sama: admin jalankan SQL{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
                  012_weekly_progress_shared_workspace.sql
                </code>{" "}
                di project Supabase (sekali), deploy app terbaru, lalu dari
                komputer yang punya isian lama tekan{" "}
                <strong className="font-semibold text-amber-100">Simpan</strong>{" "}
                di sini supaya data naik ke cloud.
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-5 sm:py-4">
          {cloudHydrating && supabase ? (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 px-4 text-center backdrop-blur-[2px]"
              aria-busy
              aria-label="Memuat data dari cloud"
            >
              <Loader2 className="h-9 w-9 shrink-0 animate-spin text-neon-cyan" />
              <p className="max-w-sm text-sm text-muted">
                Memuat data bersama dari cloud… Tabel akan menampilkan isian
                yang sama untuk semua orang yang login.
              </p>
            </div>
          ) : null}
          <div className="flex flex-col gap-8">
            <div className="border-b border-white/10 pb-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-foreground">
                  Weekly progress — grafik
                </h2>
                <p className="text-xs leading-relaxed text-muted">
                  Sumber data sama dengan isian tabel di modal ini untuk bulan{" "}
                  <span className="font-medium text-foreground/85">
                    {monthLabel}
                  </span>{" "}
                  (peramban
                  {supabase ? " + cloud Supabase" : ""}).
                </p>
                <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Submitted video per minggu (bertumpuk per campaign)
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setWeekTableFilter("all")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-neon-cyan/35",
                    weekTableFilter === "all"
                      ? "border-neon-cyan/45 bg-neon-cyan/15 text-neon-cyan"
                      : "border-white/12 bg-white/[0.04] text-foreground/90 hover:border-white/18 hover:bg-white/[0.06]",
                  )}
                >
                  Semua minggu
                  <span className="font-mono text-[11px] font-normal text-muted">
                    Σ{" "}
                    {weekSubmittedTotals.reduce(
                      (a, b) => a + b,
                      0,
                    )}
                  </span>
                </button>
                {Array.from({ length: WEEKS }, (_, w) => {
                  const total = weekSubmittedTotals[w] ?? 0;
                  const active = weekTableFilter === w;
                  const rangeLabel = weekRangesInMonth[w] ?? "";
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() =>
                        setWeekTableFilter(w as 0 | 1 | 2 | 3)
                      }
                      title={rangeLabel}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-neon-cyan/35",
                        active
                          ? "border-neon-cyan/45 bg-neon-cyan/15 text-neon-cyan"
                          : "border-white/12 bg-white/[0.04] text-foreground/90 hover:border-white/18 hover:bg-white/[0.06]",
                      )}
                    >
                      Week {w + 1}
                      <span className="font-mono text-[11px] font-normal text-muted">
                        · {total} submit
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[11px] text-muted">
                Tombol minggu menyaring{" "}
                <span className="font-medium text-foreground/80">
                  tabel di bawah
                </span>{" "}
                sekaligus memfokuskan grafik ke minggu tersebut. Pilih{" "}
                <span className="font-medium text-foreground/80">
                  Semua minggu
                </span>{" "}
                untuk ringkasan empat minggu sekaligus.
              </p>

              <div className="mt-4">
                <WeeklySubmittedInfographicChart
                  data={stackedChartData}
                  campaignKeys={stackedChartCampaignKeys}
                  height={chartWeekIndices.length === 1 ? 200 : 220}
                  reducedMotion={reducedMotion}
                  ariaLabel={`Submitted video per minggu bertumpuk per campaign untuk ${monthLabel}`}
                />
              </div>
            </div>

            {Array.from({ length: WEEKS }, (_, w) => {
              if (!visibleWeekIndices.includes(w)) return null;
              const weekRows = rowsByWeek.get(w) ?? [];
              const rangeLabel = weekRangesInMonth[w] ?? "";
              return (
                <section
                  key={w}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02]"
                >
                  <div className="flex flex-col gap-2 border-b border-white/[0.07] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Week {w + 1}
                      <span className="ml-2 font-normal text-muted">
                        · {rangeLabel}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => addRowForWeek(w)}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-3 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/20 focus:outline-none focus:ring-2 focus:ring-neon-cyan/40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah baris
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1020px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] bg-black/20">
                          <th
                            className="w-9 px-0 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted"
                            aria-label="Urutkan baris"
                          >
                            <GripVertical
                              className="mx-auto h-3.5 w-3.5 opacity-50"
                              aria-hidden
                            />
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-3">
                            Creator
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-3">
                            Campaign name
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-3">
                            Target video submit
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-3">
                            Target req another creative
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-3">
                            Target apply campaign
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-3">
                            Submitted
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-3">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekRows.map((row) => {
                          const isEditing = editingId === row.id;
                          const canDragReorder = editingId === null;
                          const isDragSource = dragRowId === row.id;
                          const isDragOver =
                            dragOverRowId === row.id &&
                            Boolean(dragRowId) &&
                            dragRowId !== row.id;
                          return (
                            <tr
                              key={row.id}
                              className={cn(
                                "border-b border-white/[0.05] transition-colors last:border-b-0",
                                isEditing
                                  ? "bg-neon-cyan/[0.06]"
                                  : "hover:bg-white/[0.02]",
                                isDragSource && "opacity-50",
                                isDragOver &&
                                  "bg-neon-cyan/[0.08] ring-1 ring-inset ring-neon-cyan/40",
                              )}
                              onDragOver={(e) => {
                                if (!canDragReorder || !dragRowId) return;
                                const src = rows.find((r) => r.id === dragRowId);
                                if (
                                  !src ||
                                  src.weekIndex !== w ||
                                  src.weekIndex !== row.weekIndex
                                ) {
                                  return;
                                }
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDragOverRowId(row.id);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const fromId =
                                  e.dataTransfer.getData(WEEKLY_ROW_DRAG_TYPE) ||
                                  e.dataTransfer.getData("text/plain") ||
                                  dragRowId;
                                setDragRowId(null);
                                setDragOverRowId(null);
                                if (
                                  !fromId ||
                                  fromId === row.id ||
                                  editingId !== null
                                ) {
                                  return;
                                }
                                const src = rows.find((r) => r.id === fromId);
                                if (
                                  !src ||
                                  src.weekIndex !== w ||
                                  row.weekIndex !== w
                                ) {
                                  return;
                                }
                                persist(
                                  reorderWithinWeek(rows, w, fromId, row.id),
                                );
                              }}
                              onDragLeave={(e) => {
                                if (e.currentTarget.contains(e.relatedTarget as Node)) {
                                  return;
                                }
                                setDragOverRowId((cur) =>
                                  cur === row.id ? null : cur,
                                );
                              }}
                            >
                              {isEditing ? (
                                <>
                                  <td className="w-9 px-0 py-1.5 align-middle" />
                                  <td className="px-2 py-1.5 sm:px-3">
                                    <input
                                      className={inputClass}
                                      value={draft.creatorName}
                                      onChange={(e) =>
                                        setDraft((d) => ({
                                          ...d,
                                          creatorName: e.target.value,
                                        }))
                                      }
                                      placeholder="Nama creator"
                                      aria-label={`Creator ${row.id}`}
                                    />
                                  </td>
                                  <td className="min-w-[10rem] px-2 py-1.5 sm:px-3">
                                    <AppSelect
                                      className={cn(
                                        weeklyCampaignSelectClass,
                                        "w-full min-w-[8rem]",
                                      )}
                                      value={draft.campaignProjectId ?? ""}
                                      onChange={(projectId) => {
                                        const opt = campaignOptions.find(
                                          (o) => o.id === projectId,
                                        );
                                        setDraft((d) => ({
                                          ...d,
                                          campaignProjectId:
                                            projectId.trim().length > 0
                                              ? projectId
                                              : undefined,
                                          campaignName: opt?.name ?? "",
                                        }));
                                      }}
                                      emptyLabel="Campaign…"
                                      options={campaignOptions.map((o) => ({
                                        value: o.id,
                                        label: o.name,
                                      }))}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 sm:px-3">
                                    <input
                                      className={inputClass}
                                      value={draft.targetVideoSubmit}
                                      onChange={(e) =>
                                        setDraft((d) => ({
                                          ...d,
                                          targetVideoSubmit: e.target.value,
                                        }))
                                      }
                                      placeholder="e.g. 5"
                                      aria-label={`Target video ${row.id}`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 sm:px-3">
                                    <input
                                      className={inputClass}
                                      value={draft.targetReqAnotherCreative}
                                      onChange={(e) =>
                                        setDraft((d) => ({
                                          ...d,
                                          targetReqAnotherCreative:
                                            e.target.value,
                                        }))
                                      }
                                      placeholder="e.g. 2"
                                      aria-label={`Target creative ${row.id}`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 sm:px-3">
                                    <input
                                      className={inputClass}
                                      value={draft.targetApplyCampaign}
                                      onChange={(e) =>
                                        setDraft((d) => ({
                                          ...d,
                                          targetApplyCampaign: e.target.value,
                                        }))
                                      }
                                      placeholder="e.g. 3"
                                      aria-label={`Target apply campaign ${row.id}`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 align-middle tabular-nums text-foreground/90 sm:px-3">
                                    <span title="Dari meja performa (creator_targets); tidak bisa diedit di sini.">
                                      {draftSubmittedMirror || "—"}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-1.5 align-middle sm:px-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        type="button"
                                        onClick={confirmEdit}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        Konfirmasi
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-2.5 text-xs font-semibold text-foreground/90 transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/20"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        Batal
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td
                                    className={cn(
                                      "w-9 px-0 py-2 align-middle select-none",
                                      canDragReorder &&
                                        "cursor-grab active:cursor-grabbing",
                                    )}
                                    draggable={canDragReorder}
                                    onDragStart={(e) => {
                                      if (!canDragReorder) {
                                        e.preventDefault();
                                        return;
                                      }
                                      e.dataTransfer.setData(
                                        WEEKLY_ROW_DRAG_TYPE,
                                        row.id,
                                      );
                                      e.dataTransfer.setData("text/plain", row.id);
                                      e.dataTransfer.effectAllowed = "move";
                                      setDragRowId(row.id);
                                    }}
                                    onDragEnd={() => {
                                      setDragRowId(null);
                                      setDragOverRowId(null);
                                    }}
                                    title="Seret untuk mengurutkan baris dalam minggu ini"
                                  >
                                    <GripVertical
                                      className="mx-auto h-4 w-4 text-muted/85"
                                      aria-hidden
                                    />
                                    <span className="sr-only">
                                      Urutkan baris
                                    </span>
                                  </td>
                                  <td className="max-w-[10rem] px-2 py-2 align-middle text-foreground/90 sm:px-3">
                                    <span className="line-clamp-2 break-words">
                                      {row.creatorName || "—"}
                                    </span>
                                  </td>
                                  <td className="max-w-[10rem] px-2 py-2 align-middle text-foreground/90 sm:px-3">
                                    <span className="line-clamp-2 break-words">
                                      {campaignLabelFromRow(row, nameByProjectId)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 align-middle tabular-nums text-foreground/90 sm:px-3">
                                    {row.targetVideoSubmit || "—"}
                                  </td>
                                  <td className="px-2 py-2 align-middle tabular-nums text-foreground/90 sm:px-3">
                                    {row.targetReqAnotherCreative || "—"}
                                  </td>
                                  <td className="px-2 py-2 align-middle tabular-nums text-foreground/90 sm:px-3">
                                    {row.targetApplyCampaign || "—"}
                                  </td>
                                  <td className="px-2 py-2 align-middle tabular-nums text-foreground/90 sm:px-3">
                                    {row.submittedVideo || "—"}
                                  </td>
                                  <td className="px-2 py-2 align-middle sm:px-3">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => startEdit(row)}
                                        disabled={
                                          editingId !== null && editingId !== row.id
                                        }
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-neon-cyan/35 bg-neon-cyan/10 px-2.5 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/18 focus:outline-none focus:ring-2 focus:ring-neon-cyan/40 disabled:pointer-events-none disabled:opacity-45"
                                      >
                                        <PencilLine className="h-3.5 w-3.5" />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => duplicateRow(row.id)}
                                        disabled={
                                          editingId !== null && editingId !== row.id
                                        }
                                        title="Duplikat baris di bawahnya (minggu yang sama)"
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/18 bg-white/[0.06] px-2.5 text-xs font-semibold text-foreground/90 transition hover:border-neon-cyan/30 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-neon-cyan/25 disabled:pointer-events-none disabled:opacity-45"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                        Duplikat
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        disabled={
                                          editingId !== null && editingId !== row.id
                                        }
                                        title="Hapus baris. Jika minggu jadi kosong, sistem menambah satu baris kosong otomatis."
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-400/35 bg-red-500/10 px-2.5 text-xs font-semibold text-red-200/95 transition hover:bg-red-500/18 focus:outline-none focus:ring-2 focus:ring-red-400/35 disabled:pointer-events-none disabled:opacity-45"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Hapus
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-muted">
            Disimpan di peramban (localStorage){" "}
            <span className="font-mono text-[11px] text-foreground/70">
              v2 · {monthKey}
            </span>
            {supabase ? (
              <>
                {" "}
                dan ke Supabase saat data berubah atau saat Anda menekan Simpan
                (cloud mengalahkan cache peramban saat modal dibuka).
              </>
            ) : null}
            . Data lama format v1 otomatis dimigrasi sekali buka.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
