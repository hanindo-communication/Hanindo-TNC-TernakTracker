"use client";

import { Copy, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type {
  Creator,
  CreatorType,
  Project,
  TargetFormRow,
  TikTokAccount,
} from "@/lib/types";
import { CreatorPicker } from "@/components/dashboard/CreatorPicker";
import type { TableSegmentOption } from "@/components/dashboard/QuickFilterChips";
import {
  BASE_PAY_PRESET_VALUES,
  defaultBasePayPreset,
  formatBasePayLabel,
} from "@/lib/dashboard/base-pay-presets";
import { OptionalNonNegIntInput } from "@/components/dashboard/OptionalNonNegIntInput";
import { AppSelect } from "@/components/ui/app-select";
import { CREATOR_TYPE_SELECT_OPTIONS } from "@/lib/dashboard/creator-type-options";
import { cn } from "@/lib/utils";

const cell =
  "border-b border-white/[0.07] px-2 py-2 align-middle text-foreground";
const thBase =
  "whitespace-nowrap border-b border-white/15 bg-white/[0.06] px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
const fieldClass =
  "h-9 w-full min-w-[7rem] rounded-md border border-white/10 bg-panel px-2 text-sm text-foreground outline-none transition [color-scheme:dark] focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25";

const inputClass = fieldClass;

/** Input % lebih ramping; angka 1–100 saja. */
const pctInputClass =
  "h-9 w-full min-w-[3.25rem] max-w-[5rem] rounded-md border border-white/10 bg-panel px-1.5 text-center text-sm tabular-nums text-foreground outline-none transition [color-scheme:dark] focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25";

const selectTriggerClass =
  "h-9 w-full min-w-[7rem] border-white/10 bg-panel px-2 text-sm shadow-none hover:border-white/15 focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25";

const DEFAULT_SHARING_PCT = {
  incentivePercent: 31,
  tncSharingPercent: 54,
  hndSharingPercent: 15,
} as const;

function clampSubmitPct(n: number): number {
  return Math.min(100, Math.max(1, Math.round(Number(n)) || 0));
}

function Req({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <span className="text-red-400" aria-hidden>
        {" "}
        *
      </span>
    </>
  );
}

interface BulkTargetSubmissionsTableProps {
  rows: TargetFormRow[];
  rowCount: number;
  onAddRow: () => void;
  onDuplicateLast: () => void;
  onUpdateRow: (idx: number, next: TargetFormRow) => void;
  onRemoveRow: (idx: number) => void;
  creators: Creator[];
  projects: Project[];
  tiktokAccounts: TikTokAccount[];
  /** Sama dengan chip di dashboard: All Creators + Hanindo PCP + FOLO Public. */
  tableSegments: TableSegmentOption[];
}

export function BulkTargetSubmissionsTable({
  rows,
  rowCount,
  onAddRow,
  onDuplicateLast,
  onUpdateRow,
  onRemoveRow,
  creators,
  projects,
  tiktokAccounts,
  tableSegments,
}: BulkTargetSubmissionsTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Bulk Target Submissions{" "}
          <span className="font-normal text-muted">
            ({rowCount} {rowCount === 1 ? "row" : "rows"})
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddRow}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-foreground transition hover:border-neon-cyan/40 hover:bg-white/[0.07]"
          >
            <span className="text-lg leading-none">+</span>
            Add Row
          </button>
          <button
            type="button"
            onClick={onDuplicateLast}
            disabled={rows.length === 0}
            title="Duplicate last row"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-muted transition hover:border-neon-cyan/40 hover:text-neon-cyan",
              rows.length === 0 && "cursor-not-allowed opacity-40",
            )}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Duplicate last row</span>
          </button>
        </div>
      </div>

      <p className="border-b border-white/[0.07] px-4 py-2.5 text-[11px] leading-relaxed text-muted sm:px-6">
        Isi <span className="font-semibold text-foreground/90">target</span> dan{" "}
        <span className="font-semibold text-foreground/90">base pay</span>, lalu
        tiga persentase: nominal ={" "}
        <span className="font-semibold text-foreground/90">
          expected revenue
        </span>{" "}
        baris itu (
        <span className="font-mono text-foreground/80">target × base pay</span>)
        dikali persen — sama dengan di tabel performance (insentif / [TNC] /
        [HND] dijumlahkan per creator).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={thBase}>
                <Req>Creator</Req>
              </th>
              <th className={thBase}>
                <Req>Table</Req>
              </th>
              <th className={thBase}>
                <Req>Campaign</Req>
              </th>
              <th className={thBase}>
                <Req>Creator Type</Req>
              </th>
              <th className={thBase}>
                <Req>TikTok Account</Req>
              </th>
              <th className={thBase}>
                <Req>Month</Req>
              </th>
              <th className={thBase}>
                <Req>Target</Req>
              </th>
              <th className={thBase}>
                <Req>Base pay</Req>
              </th>
              <th className={`${thBase} font-semibold normal-case tracking-normal`}>
                <span className="block">Incentive per video</span>
                <span className="mt-1 block text-[9px] font-normal uppercase tracking-wider text-muted/85">
                  % dari exp. rev.
                </span>
              </th>
              <th className={`${thBase} font-semibold normal-case tracking-normal`}>
                <span className="block">TNC sharing</span>
                <span className="mt-1 block text-[9px] font-normal uppercase tracking-wider text-muted/85">
                  % dari exp. rev.
                </span>
              </th>
              <th className={`${thBase} font-semibold normal-case tracking-normal`}>
                <span className="block">HND sharing</span>
                <span className="mt-1 block text-[9px] font-normal uppercase tracking-wider text-muted/85">
                  % dari exp. rev.
                </span>
              </th>
              <th className={thBase} aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <BulkTableRow
                key={idx}
                row={row}
                rowIndex={idx}
                canRemove={rows.length > 1}
                onChange={(next) => onUpdateRow(idx, next)}
                onRemove={() => onRemoveRow(idx)}
                creators={creators}
                projects={projects}
                tiktokAccounts={tiktokAccounts}
                tableSegments={tableSegments}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkTableRow({
  row,
  rowIndex,
  canRemove,
  onChange,
  onRemove,
  creators,
  projects,
  tiktokAccounts,
  tableSegments,
}: {
  row: TargetFormRow;
  rowIndex: number;
  canRemove: boolean;
  onChange: (next: TargetFormRow) => void;
  onRemove: () => void;
  creators: Creator[];
  projects: Project[];
  tiktokAccounts: TikTokAccount[];
  tableSegments: TableSegmentOption[];
}) {
  const accountsForCreator = tiktokAccounts.filter(
    (t) => t.creatorId === row.creatorId,
  );

  const patch = (partial: Partial<TargetFormRow>) => {
    onChange({ ...row, ...partial });
  };

  const onTableChange = (tableSegmentId: string) => {
    onChange({ ...row, tableSegmentId });
  };

  const onProjectChange = (projectId: string) => {
    onChange({ ...row, projectId });
  };

  const onCreatorChange = (creatorId: string) => {
    const c = creators.find((x) => x.id === creatorId);
    const firstTt = tiktokAccounts.find((t) => t.creatorId === creatorId);
    onChange({
      ...row,
      creatorId,
      creatorType: c?.creatorType ?? row.creatorType,
      tiktokAccountId: firstTt?.id ?? "",
      basePay: defaultBasePayPreset(),
      incentivePercent: DEFAULT_SHARING_PCT.incentivePercent,
      tncSharingPercent: DEFAULT_SHARING_PCT.tncSharingPercent,
      hndSharingPercent: DEFAULT_SHARING_PCT.hndSharingPercent,
    });
  };

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className={cn(cell, "min-w-[200px]")}>
        <CreatorPicker
          creators={creators}
          value={row.creatorId}
          onChange={onCreatorChange}
        />
      </td>
      <td className={cn(cell, "min-w-[150px]")}>
        <AppSelect
          className={selectTriggerClass}
          value={row.tableSegmentId}
          onChange={onTableChange}
          aria-label={`Table row ${rowIndex + 1}`}
          options={tableSegments.map((s) => ({
            value: s.id,
            label: s.label,
          }))}
        />
      </td>
      <td className={cn(cell, "min-w-[140px]")}>
        <AppSelect
          className={selectTriggerClass}
          value={row.projectId}
          onChange={onProjectChange}
          emptyLabel="Select campaign"
          aria-label={`Campaign row ${rowIndex + 1}`}
          options={projects.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
        />
      </td>
      <td className={cn(cell, "min-w-[120px]")}>
        <AppSelect
          className={selectTriggerClass}
          value={row.creatorType}
          onChange={(creatorType) => {
            patch({
              creatorType: creatorType as CreatorType,
              basePay: defaultBasePayPreset(),
              incentivePercent: DEFAULT_SHARING_PCT.incentivePercent,
              tncSharingPercent: DEFAULT_SHARING_PCT.tncSharingPercent,
              hndSharingPercent: DEFAULT_SHARING_PCT.hndSharingPercent,
            });
          }}
          aria-label={`Creator type row ${rowIndex + 1}`}
          options={[...CREATOR_TYPE_SELECT_OPTIONS]}
        />
      </td>
      <td className={cn(cell, "min-w-[160px]")}>
        <AppSelect
          className={selectTriggerClass}
          value={row.tiktokAccountId}
          onChange={(tiktokAccountId) => patch({ tiktokAccountId })}
          disabled={!row.creatorId}
          emptyLabel="Select TikTok account"
          aria-label={`TikTok account row ${rowIndex + 1}`}
          options={accountsForCreator.map((t) => ({
            value: t.id,
            label: t.label,
          }))}
        />
      </td>
      <td className={cn(cell, "min-w-[130px]")}>
        <input
          type="month"
          className={inputClass}
          value={row.month}
          onChange={(e) => patch({ month: e.target.value })}
          aria-label={`Month row ${rowIndex + 1}`}
        />
      </td>
      <td className={cn(cell, "w-24 min-w-[5rem]")}>
        <OptionalNonNegIntInput
          className={inputClass}
          value={row.targetVideos}
          onCommit={(n) => patch({ targetVideos: n })}
          aria-label={`Target videos row ${rowIndex + 1}`}
        />
      </td>
      <td className={cn(cell, "min-w-[9rem]")}>
        <AppSelect
          className={selectTriggerClass}
          value={String(row.basePay)}
          onChange={(v) => patch({ basePay: Number(v) })}
          aria-label={`Base pay row ${rowIndex + 1}`}
          options={BASE_PAY_PRESET_VALUES.map((v) => ({
            value: String(v),
            label: formatBasePayLabel(v),
          }))}
        />
      </td>
      <td className={cn(cell, "w-[4.5rem]")}>
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          className={pctInputClass}
          value={row.incentivePercent}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            patch({ incentivePercent: clampSubmitPct(n) });
          }}
          aria-label={`Incentive per video % dari expected revenue baris, row ${rowIndex + 1}`}
        />
      </td>
      <td className={cn(cell, "w-[4.5rem]")}>
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          className={pctInputClass}
          value={row.tncSharingPercent}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            patch({ tncSharingPercent: clampSubmitPct(n) });
          }}
          aria-label={`TNC sharing % dari expected revenue baris, row ${rowIndex + 1}`}
        />
      </td>
      <td className={cn(cell, "w-[4.5rem]")}>
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          className={pctInputClass}
          value={row.hndSharingPercent}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            patch({ hndSharingPercent: clampSubmitPct(n) });
          }}
          aria-label={`HND sharing % dari expected revenue baris, row ${rowIndex + 1}`}
        />
      </td>
      <td className={cn(cell, "w-12")}>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-muted transition hover:border-red-400/50 hover:text-red-300"
            title="Remove row"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </td>
    </tr>
  );
}
