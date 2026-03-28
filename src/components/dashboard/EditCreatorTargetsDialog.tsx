"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  type CreatorTargetRowSave,
} from "@/lib/dashboard/merge-targets";
import { normalizeTargetTableSegmentForKey } from "@/lib/types";
import { AppSelect } from "@/components/ui/app-select";
import { Spinner } from "@/components/ui/spinner";

export interface EditTargetRowSnapshot {
  targetId: string;
  projectName: string;
  campaignLabel: string;
  targetVideos: number;
  tableSegmentId: string;
  basePay: number;
  incentivePercent: number;
  tncSharingPercent: number;
  hndSharingPercent: number;
}

type RowValues = {
  targetVideos: number;
  tableSegmentId: string;
  basePay: number;
  incentivePercent: number;
  tncSharingPercent: number;
  hndSharingPercent: number;
};

interface EditCreatorTargetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
  rows: EditTargetRowSnapshot[];
  tableSegments: TableSegmentOption[];
  onSave: (updates: CreatorTargetRowSave[]) => void | Promise<void>;
  onSaveSuccess?: () => void;
}

const fieldClass =
  "h-9 w-full min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-foreground outline-none transition focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25 [color-scheme:dark]";

const editSelectTriggerClass =
  "h-9 w-full min-w-0 border-white/10 bg-white/[0.04] px-2 text-sm shadow-none hover:border-white/12 focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25";

function clampPctInput(n: number): number {
  return Math.min(100, Math.max(1, Math.round(Number(n)) || 0));
}

export function EditCreatorTargetsDialog({
  open,
  onOpenChange,
  creatorId: _creatorId,
  creatorName,
  rows,
  tableSegments,
  onSave,
  onSaveSuccess,
}: EditCreatorTargetsDialogProps) {
  const [values, setValues] = useState<Record<string, RowValues>>({});
  const [saving, setSaving] = useState(false);

  const basePayOptions = useMemo(() => [...BASE_PAY_PRESET_VALUES], []);

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
            incentivePercent: r.incentivePercent,
            tncSharingPercent: r.tncSharingPercent,
            hndSharingPercent: r.hndSharingPercent,
          },
        ]),
      ),
    );
  }, [open, rows]);

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
        v.incentivePercent !== r.incentivePercent ||
        v.tncSharingPercent !== r.tncSharingPercent ||
        v.hndSharingPercent !== r.hndSharingPercent
      ) {
        updates.push({
          targetId: r.targetId,
          targetVideos: v.targetVideos,
          tableSegmentId: v.tableSegmentId,
          basePay: v.basePay,
          incentivePercent: clampPctInput(v.incentivePercent),
          tncSharingPercent: clampPctInput(v.tncSharingPercent),
          hndSharingPercent: clampPctInput(v.hndSharingPercent),
        });
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
            Ubah meja (Table), target, base pay, dan persentase (1–100%): nominal
            tiap kolom ={" "}
            <span className="font-medium text-foreground/90">
              expected revenue
            </span>{" "}
            baris (target × base pay) × persen.
          </DialogDescription>
        </DialogHeader>

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
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Incentive per video (% dari exp. revenue)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        className={fieldClass}
                        value={v.incentivePercent}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n)) return;
                          patchRow(r.targetId, {
                            incentivePercent: clampPctInput(n),
                          });
                        }}
                        disabled={saving}
                        aria-label={`Incentive % untuk ${r.projectName}`}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neon-cyan/90">
                        TNC sharing (% dari exp. revenue)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        className={fieldClass}
                        value={v.tncSharingPercent}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n)) return;
                          patchRow(r.targetId, {
                            tncSharingPercent: clampPctInput(n),
                          });
                        }}
                        disabled={saving}
                        aria-label={`TNC sharing % untuk ${r.projectName}`}
                      />
                    </label>
                    <label className="block space-y-1.5 sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neon-purple/90">
                        HND sharing (% dari exp. revenue)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        className={fieldClass}
                        value={v.hndSharingPercent}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n)) return;
                          patchRow(r.targetId, {
                            hndSharingPercent: clampPctInput(n),
                          });
                        }}
                        disabled={saving}
                        aria-label={`HND sharing % untuk ${r.projectName}`}
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
