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
import type { CreatorTargetRowSave } from "@/lib/dashboard/merge-targets";
import { normalizeTargetTableSegmentForKey } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  creatorName: string;
  rows: EditTargetRowSnapshot[];
  tableSegments: TableSegmentOption[];
  onSave: (updates: CreatorTargetRowSave[]) => void | Promise<void>;
}

const fieldClass =
  "h-9 w-full min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-foreground outline-none transition focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25 [color-scheme:dark]";

const selectClass = cn(fieldClass, "bulk-native-select");

export function EditCreatorTargetsDialog({
  open,
  onOpenChange,
  creatorName,
  rows,
  tableSegments,
  onSave,
}: EditCreatorTargetsDialogProps) {
  const [values, setValues] = useState<Record<string, RowValues>>({});
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

    if (updates.length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(updates);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,720px)] overflow-y-auto border-white/10 bg-[#070c18]/98 sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit target — {creatorName}</DialogTitle>
          <DialogDescription>
            Ubah meja (Table), jumlah video target, base pay, dan incentive per video
            per campaign. Expected revenue &amp; incentives dihitung ulang otomatis.
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
                      <select
                        className={selectClass}
                        value={v.tableSegmentId}
                        onChange={(e) =>
                          patchRow(r.targetId, {
                            tableSegmentId: e.target.value,
                          })
                        }
                        disabled={saving}
                        aria-label={`Table untuk ${r.projectName}`}
                      >
                        {tableSegments.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Base pay
                      </span>
                      <select
                        className={selectClass}
                        value={v.basePay}
                        onChange={(e) =>
                          patchRow(r.targetId, {
                            basePay: Number(e.target.value),
                          })
                        }
                        disabled={saving}
                        aria-label={`Base pay untuk ${r.projectName}`}
                      >
                        {basePayOptions.map((bp) => (
                          <option key={bp} value={bp}>
                            {formatBasePayLabel(bp)}
                          </option>
                        ))}
                      </select>
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
            className="rounded-xl border border-neon-cyan/40 bg-neon-cyan/15 px-4 py-2 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/25 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
