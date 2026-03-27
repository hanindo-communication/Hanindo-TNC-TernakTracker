"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreatorHanindoPercents } from "@/hooks/useCreatorHanindoPercents";
import { splitErForTncHndColumns } from "@/hooks/useCreatorDashboard";
import { flushSync } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OptionalNonNegIntInput } from "@/components/dashboard/OptionalNonNegIntInput";
import type { TableSegmentOption } from "@/components/dashboard/QuickFilterChips";
import {
  BASE_PAY_PRESET_VALUES,
  formatBasePayLabel,
} from "@/lib/dashboard/base-pay-presets";
import type { CreatorTargetRowSave } from "@/lib/dashboard/merge-targets";
import { normalizeTargetTableSegmentForKey } from "@/lib/types";
import { AppSelect } from "@/components/ui/app-select";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/utils";

export interface EditTargetRowSnapshot {
  targetId: string;
  projectName: string;
  campaignLabel: string;
  targetVideos: number;
  tableSegmentId: string;
  basePay: number;
  incentivePerVideo: number;
}

type RowValues = {
  targetVideos: number;
  tableSegmentId: string;
  basePay: number;
  incentivePerVideo: number;
};

interface EditCreatorTargetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
  rows: EditTargetRowSnapshot[];
  tableSegments: TableSegmentOption[];
  resolveHanindoPercent: (creatorId: string) => number;
  onPersistHanindoPercent: (
    creatorId: string,
    percent: number,
  ) => void | Promise<void>;
  onSave: (updates: CreatorTargetRowSave[]) => void | Promise<void>;
  /** Dipanggil setelah simpan berhasil (termasuk hanya % Hanindo tanpa baris target). */
  onSaveSuccess?: () => void;
}

const fieldClass =
  "h-9 w-full min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-foreground outline-none transition focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25 [color-scheme:dark]";

const editSelectTriggerClass =
  "h-9 w-full min-w-0 border-white/10 bg-white/[0.04] px-2 text-sm shadow-none hover:border-white/12 focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25";

const clampPct = (n: number) =>
  Math.min(100, Math.max(0, Math.round(n * 10) / 10));

const MAX_HND_PCT = 50;

type AllocationPctDraft = { inc: number; tnc: number; hnd: number };

function buildAllocationDraftFromRows(
  snapshotRows: EditTargetRowSnapshot[],
  hanindoPctSaved: number,
): AllocationPctDraft {
  let er = 0;
  let inc = 0;
  for (const r of snapshotRows) {
    const tv = Math.max(0, Math.floor(Number(r.targetVideos)) || 0);
    const bp = Math.max(0, Number(r.basePay) || 0);
    const ipv = Math.max(0, Math.floor(Number(r.incentivePerVideo)) || 0);
    er += tv * bp;
    inc += tv * ipv;
  }
  const hndPctSaved = hanindoPctSaved;
  const rate = Math.min(MAX_HND_PCT, Math.max(0, hndPctSaved)) / 100;
  const { hndExpectedProfit } = splitErForTncHndColumns(er, inc, rate);
  if (er <= 0) {
    const h = Math.min(MAX_HND_PCT, clampPct(hndPctSaved));
    return { inc: 0, tnc: clampPct(100 - h), hnd: h };
  }
  let incP = clampPct((inc / er) * 100);
  const hndP = Math.min(
    MAX_HND_PCT,
    clampPct((hndExpectedProfit / er) * 100),
  );
  incP = Math.min(incP, 100 - hndP);
  const tncP = clampPct(100 - incP - hndP);
  return { inc: incP, tnc: tncP, hnd: hndP };
}

export function EditCreatorTargetsDialog({
  open,
  onOpenChange,
  creatorId,
  creatorName,
  rows,
  tableSegments,
  resolveHanindoPercent,
  onPersistHanindoPercent,
  onSave,
  onSaveSuccess,
}: EditCreatorTargetsDialogProps) {
  const { setPercent, defaultPercent } = useCreatorHanindoPercents();
  const [values, setValues] = useState<Record<string, RowValues>>({});
  const [draftAllocationPct, setDraftAllocationPct] =
    useState<AllocationPctDraft>({
      inc: 0,
      tnc: 0,
      hnd: defaultPercent,
    });
  const [saving, setSaving] = useState(false);

  const basePayOptions = useMemo(() => {
    const s = new Set<number>([...BASE_PAY_PRESET_VALUES]);
    for (const r of rows) s.add(r.basePay);
    return [...s].sort((a, b) => a - b);
  }, [rows]);

  useEffect(() => {
    if (!open) return;
    setValues(
      Object.fromEntries(
        rows.map((r) => [
          r.targetId,
          {
            targetVideos: r.targetVideos,
            tableSegmentId: normalizeTargetTableSegmentForKey(
              r.tableSegmentId,
            ),
            basePay: r.basePay,
            incentivePerVideo: r.incentivePerVideo,
          },
        ]),
      ),
    );
    if (creatorId) {
      setDraftAllocationPct(
        buildAllocationDraftFromRows(rows, resolveHanindoPercent(creatorId)),
      );
    }
  }, [open, rows, creatorId, resolveHanindoPercent]);

  const allocationPreview = useMemo(() => {
    let er = 0;
    for (const r of rows) {
      const v = values[r.targetId];
      if (!v) continue;
      const tv = Math.max(0, Math.floor(Number(v.targetVideos)) || 0);
      const bp = Math.max(0, Number(v.basePay) || 0);
      er += tv * bp;
    }
    const pct = draftAllocationPct;
    const inc = er > 0 ? (er * pct.inc) / 100 : 0;
    const tncExpectedProfit = er > 0 ? (er * pct.tnc) / 100 : 0;
    const hndExpectedProfit = er > 0 ? (er * pct.hnd) / 100 : 0;
    return {
      er,
      inc,
      tncExpectedProfit,
      hndExpectedProfit,
      incPct: pct.inc,
      tncPct: pct.tnc,
      hndPctOfEr: pct.hnd,
    };
  }, [rows, values, draftAllocationPct]);

  const patchRow = (id: string, partial: Partial<RowValues>) => {
    setValues((v) => {
      const cur = v[id];
      if (!cur) return v;
      return { ...v, [id]: { ...cur, ...partial } };
    });
  };

  const handleSave = async () => {
    const norm = normalizeTargetTableSegmentForKey;
    const updates: CreatorTargetRowSave[] = [];

    for (const r of rows) {
      const v = values[r.targetId];
      if (!v) continue;
      const segForm = norm(v.tableSegmentId);
      const segSnap = norm(r.tableSegmentId);
      if (
        v.targetVideos !== r.targetVideos ||
        segForm !== segSnap ||
        v.basePay !== r.basePay ||
        v.incentivePerVideo !== r.incentivePerVideo
      ) {
        updates.push({
          targetId: r.targetId,
          targetVideos: v.targetVideos,
          tableSegmentId: v.tableSegmentId,
          basePay: v.basePay,
          incentivePerVideo: v.incentivePerVideo,
        });
      }
    }

    if (creatorId) {
      setPercent(creatorId, draftAllocationPct.hnd);
      try {
        await onPersistHanindoPercent(creatorId, draftAllocationPct.hnd);
      } catch {
        return;
      }
    }

    if (updates.length === 0) {
      onSaveSuccess?.();
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(updates);
      onSaveSuccess?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(92vh,720px)] overflow-y-auto border-white/10 bg-[#070c18]/98 sm:max-w-lg md:max-w-xl"
        aria-busy={saving}
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {saving ? "Menyimpan perubahan target…" : ""}
        </p>
        <DialogHeader>
          <DialogTitle>Edit target — {creatorName}</DialogTitle>
          <DialogDescription>
            Ubah meja (Table), jumlah video target, base pay, incentive per video,
            dan % Hanindo untuk kolom [HND]. Preview memakai identitas{" "}
            <span className="text-foreground/90">ER = incentives + [TNC] + [HND]</span>.
          </DialogDescription>
        </DialogHeader>

        {rows.length > 0 && creatorId ? (
          <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Alokasi vs expected revenue (preview)
              </p>
              <p className="text-[10px] text-muted/90">
                Tiga % di bawah ini selalu berjumlah 100%. Hanya % [HND] yang
                disimpan ke pengaturan creator; incentives di data target tetap
                dari kolom per baris.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Incentives (% dari ER)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={draftAllocationPct.inc}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setDraftAllocationPct((p) => {
                      const inc = Math.min(clampPct(n), 100 - p.hnd);
                      const tnc = clampPct(100 - inc - p.hnd);
                      return { inc, tnc, hnd: p.hnd };
                    });
                  }}
                  disabled={saving}
                  className={fieldClass}
                  aria-label="Persentase incentives dari expected revenue"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neon-cyan/90">
                  [TNC] (% dari ER)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={draftAllocationPct.tnc}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setDraftAllocationPct((p) => {
                      let tnc = Math.min(clampPct(n), 100 - p.inc);
                      let hnd = clampPct(100 - p.inc - tnc);
                      if (hnd > MAX_HND_PCT) {
                        hnd = MAX_HND_PCT;
                        tnc = clampPct(100 - p.inc - hnd);
                      }
                      return { inc: p.inc, tnc, hnd };
                    });
                  }}
                  disabled={saving}
                  className={fieldClass}
                  aria-label="Persentase TNC dari expected revenue"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neon-purple/90">
                  [HND] Hanindo (% dari ER)
                </span>
                <input
                  type="number"
                  min={0}
                  max={MAX_HND_PCT}
                  step={0.1}
                  value={draftAllocationPct.hnd}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setDraftAllocationPct((p) => {
                      const hnd = Math.min(
                        clampPct(n),
                        MAX_HND_PCT,
                        100 - p.inc,
                      );
                      const tnc = clampPct(100 - p.inc - hnd);
                      return { inc: p.inc, tnc, hnd };
                    });
                  }}
                  disabled={saving}
                  className={fieldClass}
                  aria-label="Persentase Hanindo dari expected revenue"
                />
              </label>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-xs tabular-nums">
              <dt className="text-muted">Expected revenue</dt>
              <dd className="text-right font-medium text-foreground">
                {formatCurrency(allocationPreview.er)}
              </dd>
              <dt className="text-muted">
                Incentives ({allocationPreview.incPct.toFixed(1)}% ER)
              </dt>
              <dd className="text-right text-foreground/90">
                {formatCurrency(allocationPreview.inc)}
              </dd>
              <dt className="text-neon-cyan/90">
                [TNC] ({allocationPreview.tncPct.toFixed(1)}% ER)
              </dt>
              <dd className="text-right text-neon-cyan/90">
                {formatCurrency(allocationPreview.tncExpectedProfit)}
              </dd>
              <dt className="text-neon-purple/90">
                [HND] ({allocationPreview.hndPctOfEr.toFixed(1)}% ER)
              </dt>
              <dd className="text-right text-neon-purple/90">
                {formatCurrency(allocationPreview.hndExpectedProfit)}
              </dd>
            </dl>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-muted">
            Tidak ada baris target untuk creator ini di bulan yang dipilih.
          </p>
        ) : (
          <div className="max-h-[min(440px,52vh)] space-y-3 overflow-y-auto pr-1">
            {rows.map((r) => {
              const v = values[r.targetId];
              if (!v) return null;
              return (
                <div
                  key={r.targetId}
                  className="space-y-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.projectName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {r.campaignLabel}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Table
                      </span>
                      <AppSelect
                        className={editSelectTriggerClass}
                        value={v.tableSegmentId}
                        onChange={(tableSegmentId) =>
                          patchRow(r.targetId, { tableSegmentId })
                        }
                        disabled={saving}
                        aria-label={`Table untuk ${r.projectName}`}
                        options={tableSegments.map((s) => ({
                          value: s.id,
                          label: s.label,
                        }))}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Base pay
                      </span>
                      <AppSelect
                        className={editSelectTriggerClass}
                        value={String(v.basePay)}
                        onChange={(bp) =>
                          patchRow(r.targetId, {
                            basePay: Number(bp),
                          })
                        }
                        disabled={saving}
                        aria-label={`Base pay untuk ${r.projectName}`}
                        options={basePayOptions.map((bp) => ({
                          value: String(bp),
                          label: formatBasePayLabel(bp),
                        }))}
                      />
                    </label>
                    <label className="block space-y-1.5 sm:col-span-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Target videos
                      </span>
                      <OptionalNonNegIntInput
                        className={fieldClass}
                        value={v.targetVideos}
                        onLiveUpdate={(n) =>
                          patchRow(r.targetId, { targetVideos: n })
                        }
                        onCommit={(n) =>
                          flushSync(() =>
                            patchRow(r.targetId, { targetVideos: n }),
                          )
                        }
                        aria-label={`Target videos untuk ${r.projectName}`}
                      />
                    </label>
                    <label className="block space-y-1.5 sm:col-span-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Incentive / video
                      </span>
                      <OptionalNonNegIntInput
                        className={fieldClass}
                        value={v.incentivePerVideo}
                        onLiveUpdate={(n) =>
                          patchRow(r.targetId, { incentivePerVideo: n })
                        }
                        onCommit={(n) =>
                          flushSync(() =>
                            patchRow(r.targetId, { incentivePerVideo: n }),
                          )
                        }
                        aria-label={`Incentive per video untuk ${r.projectName}`}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white/5 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || rows.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/40 bg-neon-cyan/15 px-4 py-2 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/25 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Spinner className="h-4 w-4 text-neon-cyan" />
                Menyimpan…
              </>
            ) : (
              "Simpan"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
