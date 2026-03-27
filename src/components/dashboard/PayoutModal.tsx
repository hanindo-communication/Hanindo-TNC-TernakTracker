"use client";

import { ImagePlus, Trash2, Wallet } from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AggregatedCreatorRow } from "@/hooks/useCreatorDashboard";
import { formatCurrency, labelMonth } from "@/lib/utils";

interface PayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
  creatorRows: AggregatedCreatorRow[];
}

type ImageRow = { id: string; previewUrl: string | null };

type SplitRatios = {
  creator: number;
  tnc: number;
  hnd: number;
};

const ASSET_LOAN_RATIOS: SplitRatios = {
  creator: 0.35,
  tnc: 0.5,
  hnd: 0.15,
};

const INTERNAL_RATIOS: SplitRatios = {
  creator: 0.31,
  tnc: 0.54,
  hnd: 0.15,
};

function sumActualRevenue(rows: AggregatedCreatorRow[]): number {
  let total = 0;
  for (const r of rows) {
    total += r.actualRevenue;
  }
  return total;
}

function deriveFromPayout(base: number, ratios: SplitRatios) {
  const safe = Number.isFinite(base) ? Math.max(0, base) : 0;
  return {
    creatorProfit: Math.round(safe * ratios.creator),
    tncActualProfit: Math.round(safe * ratios.tnc),
    hndActualProfit: Math.round(safe * ratios.hnd),
  };
}

function PayoutProofTable({
  imageRows,
  addRow,
  removeRow,
  onFile,
  tableShell,
}: {
  imageRows: ImageRow[];
  addRow: () => void;
  removeRow: (id: string) => void;
  onFile: (id: string, file: File | undefined) => void;
  tableShell: string;
}) {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        Bukti / lampiran gambar
      </p>
      <div className={tableShell}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.03]">
              <th className="w-10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                #
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Pratinjau
              </th>
              <th className="w-[140px] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Unggah
              </th>
            </tr>
          </thead>
          <tbody>
            {imageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-10 text-center text-xs text-muted"
                >
                  Belum ada baris. Klik &quot;Tambah baris&quot; untuk
                  melampirkan screenshot bukti transfer, invoice, dll.
                </td>
              </tr>
            ) : (
              imageRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.05] last:border-b-0"
                >
                  <td className="px-3 py-3 align-middle tabular-nums text-muted">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-white/12 bg-black/20 p-1">
                      {row.previewUrl ? (
                        <img
                          src={row.previewUrl}
                          alt=""
                          className="max-h-24 max-w-full rounded-md object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-muted">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex flex-col gap-1.5">
                      <label className="cursor-pointer">
                        <span className="inline-flex w-full items-center justify-center rounded-lg border border-white/12 bg-white/[0.06] px-2 py-1.5 text-[11px] font-semibold text-foreground/90 transition hover:border-neon-cyan/35 hover:bg-white/[0.09]">
                          <ImagePlus className="mr-1 h-3.5 w-3.5" />
                          Pilih gambar
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            onFile(row.id, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                          aria-label={`Unggah gambar baris ${idx + 1}`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-400/20 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-200/90 transition hover:border-red-400/40 hover:bg-red-500/15"
                        title="Hapus baris"
                      >
                        <Trash2 className="h-3 w-3" />
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-lg border border-white/12 bg-white/[0.04] px-3 text-xs font-semibold text-foreground/90 transition hover:border-neon-cyan/35 hover:bg-white/[0.07]"
      >
        <ImagePlus className="h-3.5 w-3.5" />
        Tambah baris
      </button>
    </>
  );
}

function PayoutSummaryTable({
  actualPayoutInput,
  onActualPayoutChange,
  ratios,
}: {
  actualPayoutInput: number;
  onActualPayoutChange: (v: number) => void;
  ratios: SplitRatios;
}) {
  const derived = useMemo(
    () => deriveFromPayout(actualPayoutInput, ratios),
    [actualPayoutInput, ratios],
  );
  const tableShell =
    "overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]";

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        Ringkasan aktual
      </p>
      <div className={tableShell}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.03]">
              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Metrik
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">
                Nilai
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.05]">
              <td className="px-4 py-3 font-medium text-foreground/90">
                Actual Payout
              </td>
              <td className="px-4 py-3 text-right">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={Number.isFinite(actualPayoutInput) ? actualPayoutInput : 0}
                  onChange={(e) =>
                    onActualPayoutChange(
                      Math.max(0, Math.floor(Number(e.target.value)) || 0),
                    )
                  }
                  className="w-full min-w-[140px] rounded-lg border border-white/12 bg-black/35 px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-foreground outline-none transition focus:border-neon-cyan/40 focus:ring-1 focus:ring-neon-cyan/20"
                  aria-label="Actual Payout"
                />
              </td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="px-4 py-3 font-medium text-emerald-200/95">
                Creator Profit
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-100/95">
                {formatCurrency(derived.creatorProfit)}
              </td>
            </tr>
            <tr className="border-b border-white/[0.05]">
              <td className="px-4 py-3 font-medium text-sky-200/95">
                [TNC] Actual Profit
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-sky-100/95">
                {formatCurrency(derived.tncActualProfit)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-neon-purple/95">
                [HND] Actual Profit
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-neon-purple/90">
                {formatCurrency(derived.hndActualProfit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export function PayoutModal({
  open,
  onOpenChange,
  monthKey,
  creatorRows,
}: PayoutModalProps) {
  const [assetLoanImageRows, setAssetLoanImageRows] = useState<ImageRow[]>([]);
  const [internalImageRows, setInternalImageRows] = useState<ImageRow[]>([]);
  const [assetLoanPayout, setAssetLoanPayout] = useState(0);
  const [internalPayout, setInternalPayout] = useState(0);

  const assetLoanRef = useRef(assetLoanImageRows);
  const internalRef = useRef(internalImageRows);
  assetLoanRef.current = assetLoanImageRows;
  internalRef.current = internalImageRows;

  const seedActualPayout = useMemo(
    () => sumActualRevenue(creatorRows),
    [creatorRows],
  );

  const revokePreviews = useCallback((rows: ImageRow[]) => {
    for (const row of rows) {
      if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setAssetLoanPayout(seedActualPayout);
      setInternalPayout(seedActualPayout);
    }
  }, [open, monthKey, seedActualPayout]);

  useEffect(() => {
    if (!open) {
      setAssetLoanImageRows((prev) => {
        revokePreviews(prev);
        return [];
      });
      setInternalImageRows((prev) => {
        revokePreviews(prev);
        return [];
      });
    }
  }, [open, revokePreviews]);

  useEffect(() => {
    return () => {
      revokePreviews(assetLoanRef.current);
      revokePreviews(internalRef.current);
    };
  }, [revokePreviews]);

  const tableShell =
    "overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]";

  const makeImageHandlers = (
    setRows: Dispatch<SetStateAction<ImageRow[]>>,
  ) => {
    const addRow = () => {
      setRows((prev) => [...prev, { id: crypto.randomUUID(), previewUrl: null }]);
    };
    const removeRow = (id: string) => {
      setRows((prev) => {
        const row = prev.find((r) => r.id === id);
        if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl);
        return prev.filter((r) => r.id !== id);
      });
    };
    const onFile = (id: string, file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
          return { ...r, previewUrl: URL.createObjectURL(file) };
        }),
      );
    };
    return { addRow, removeRow, onFile };
  };

  const assetLoanHandlers = makeImageHandlers(setAssetLoanImageRows);
  const internalHandlers = makeImageHandlers(setInternalImageRows);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,880px)] max-w-5xl overflow-y-auto border-neon-cyan/15 p-0 gap-0">
        <DialogHeader className="border-b border-white/[0.06] px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-neon-cyan/90" />
            Payout
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Bukti pembayaran (gambar) dan ringkasan aktual untuk{" "}
            <span className="font-medium text-foreground/90">
              {labelMonth(monthKey)}
            </span>
            — dua blok{" "}
            <strong className="font-medium text-foreground/85">Asset Loan</strong>{" "}
            dan{" "}
            <strong className="font-medium text-foreground/85">Internal</strong>.
            Nilai awal Actual Payout mengikuti jumlah{" "}
            <span className="text-foreground/85">actual revenue</span> pada baris
            yang tampil di tabel performa (filter + chip segmen); Anda dapat
            mengubahnya per blok. Pembagian persen tercantum di bawah setiap
            ringkasan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 px-5 py-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground/95">
              Asset Loan
            </h3>
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="min-w-0 flex flex-col gap-2">
                <PayoutProofTable
                  imageRows={assetLoanImageRows}
                  addRow={assetLoanHandlers.addRow}
                  removeRow={assetLoanHandlers.removeRow}
                  onFile={assetLoanHandlers.onFile}
                  tableShell={tableShell}
                />
              </div>
              <div className="min-w-0 flex flex-col gap-2">
                <PayoutSummaryTable
                  actualPayoutInput={assetLoanPayout}
                  onActualPayoutChange={setAssetLoanPayout}
                  ratios={ASSET_LOAN_RATIOS}
                />
                <p className="text-[11px] leading-relaxed text-muted">
                  <strong className="font-medium text-foreground/80">
                    Asset Loan
                  </strong>
                  : Creator Profit 35%, [TNC] 50%, [HND] 15% dari Actual Payout.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-white/[0.06] pt-6">
            <h3 className="text-sm font-semibold tracking-tight text-foreground/95">
              Internal
            </h3>
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="min-w-0 flex flex-col gap-2">
                <PayoutProofTable
                  imageRows={internalImageRows}
                  addRow={internalHandlers.addRow}
                  removeRow={internalHandlers.removeRow}
                  onFile={internalHandlers.onFile}
                  tableShell={tableShell}
                />
              </div>
              <div className="min-w-0 flex flex-col gap-2">
                <PayoutSummaryTable
                  actualPayoutInput={internalPayout}
                  onActualPayoutChange={setInternalPayout}
                  ratios={INTERNAL_RATIOS}
                />
                <p className="text-[11px] leading-relaxed text-muted">
                  <strong className="font-medium text-foreground/80">
                    Internal
                  </strong>
                  : Creator Profit 31%, [TNC] 54%, [HND] 15% dari Actual Payout.
                </p>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
