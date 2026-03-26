"use client";

import { Copy, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type {
  Brand,
  CampaignObjective,
  Creator,
  CreatorTarget,
  CreatorType,
  Project,
  TikTokAccount,
  VideoSubmitFormRow,
} from "@/lib/types";
import { CreatorPicker } from "@/components/dashboard/CreatorPicker";
import { VideoUrlsTagInput } from "@/components/dashboard/VideoUrlsTagInput";
import type { TableSegmentOption } from "@/components/dashboard/QuickFilterChips";
import { TABLE_SEGMENT_ALL_ID } from "@/lib/dashboard/table-segments";
import { cn } from "@/lib/utils";

const cell =
  "border-b border-white/[0.07] px-2 py-2 align-top text-foreground";
const thBase =
  "whitespace-nowrap border-b border-white/15 bg-white/[0.06] px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
const fieldClass =
  "min-h-[2.25rem] w-full min-w-[7rem] rounded-md border border-white/10 bg-panel px-2 text-sm text-foreground outline-none transition [color-scheme:dark] focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/25";
const selectClass = cn(fieldClass, "bulk-native-select h-9");

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

interface BulkVideoSubmissionsTableProps {
  rows: VideoSubmitFormRow[];
  onAddRow: () => void;
  onDuplicateLast: () => void;
  onUpdateRow: (idx: number, next: VideoSubmitFormRow) => void;
  onRemoveRow: (idx: number) => void;
  creators: Creator[];
  projects: Project[];
  campaignObjectives: CampaignObjective[];
  tiktokAccounts: TikTokAccount[];
  tableSegments: TableSegmentOption[];
  bulkMode: boolean;
}

export function BulkVideoSubmissionsTable({
  rows,
  onAddRow,
  onDuplicateLast,
  onUpdateRow,
  onRemoveRow,
  creators,
  projects,
  campaignObjectives,
  tiktokAccounts,
  tableSegments,
  bulkMode,
}: BulkVideoSubmissionsTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Bulk Video Submissions{" "}
          <span className="font-normal text-muted">
            ({rows.length} {rows.length === 1 ? "row" : "rows"})
          </span>
        </h3>
        {bulkMode ? (
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
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={thBase}>#</th>
              <th className={thBase}>
                <Req>Creator</Req>
              </th>
              <th className={thBase}>
                <Req>Table</Req>
              </th>
              <th className={thBase}>
                <Req>Project</Req>
              </th>
              <th className={thBase}>
                <Req>Campaign Objective</Req>
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
                <Req>Video URLs</Req>
              </th>
              {bulkMode ? (
                <th className={thBase} aria-label="Row actions" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <VideoBulkTableRow
                key={idx}
                row={row}
                rowIndex={idx}
                canRemove={bulkMode && rows.length > 1}
                onChange={(next) => onUpdateRow(idx, next)}
                onRemove={() => onRemoveRow(idx)}
                creators={creators}
                projects={projects}
                campaignObjectives={campaignObjectives}
                tiktokAccounts={tiktokAccounts}
                tableSegments={tableSegments}
                bulkMode={bulkMode}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VideoBulkTableRow({
  row,
  rowIndex,
  canRemove,
  onChange,
  onRemove,
  creators,
  projects,
  campaignObjectives,
  tiktokAccounts,
  tableSegments,
  bulkMode,
}: {
  row: VideoSubmitFormRow;
  rowIndex: number;
  canRemove: boolean;
  onChange: (next: VideoSubmitFormRow) => void;
  onRemove: () => void;
  creators: Creator[];
  projects: Project[];
  campaignObjectives: CampaignObjective[];
  tiktokAccounts: TikTokAccount[];
  tableSegments: TableSegmentOption[];
  bulkMode: boolean;
}) {
  const locked = Boolean(row.targetId);
  const accountsForCreator = tiktokAccounts.filter(
    (t) => t.creatorId === row.creatorId,
  );

  const patch = (partial: Partial<VideoSubmitFormRow>) => {
    onChange({ ...row, ...partial });
  };

  const onTableChange = (tableSegmentId: string) => {
    if (locked) return;
    onChange({ ...row, tableSegmentId });
  };

  const onProjectChange = (projectId: string) => {
    if (locked) return;
    onChange({ ...row, projectId });
  };

  const onCreatorChange = (creatorId: string) => {
    if (locked) return;
    const c = creators.find((x) => x.id === creatorId);
    const firstTt = tiktokAccounts.find((t) => t.creatorId === creatorId);
    onChange({
      ...row,
      creatorId,
      creatorType: c?.creatorType ?? row.creatorType,
      tiktokAccountId: firstTt?.id ?? "",
    });
  };

  const disableIdentity = locked || !bulkMode;

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className={cn(cell, "w-10 font-mono text-muted")}>{rowIndex + 1}</td>
      <td className={cn(cell, "min-w-[200px]")}>
        {disableIdentity ? (
          <span className="block py-2 text-sm">
            {creators.find((x) => x.id === row.creatorId)?.name ?? "—"}
          </span>
        ) : (
          <CreatorPicker
            creators={creators}
            value={row.creatorId}
            onChange={onCreatorChange}
          />
        )}
      </td>
      <td className={cn(cell, "min-w-[150px]")}>
        <select
          className={selectClass}
          value={row.tableSegmentId}
          onChange={(e) => onTableChange(e.target.value)}
          disabled={disableIdentity}
          aria-label={`Table row ${rowIndex + 1}`}
        >
          {tableSegments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </td>
      <td className={cn(cell, "min-w-[140px]")}>
        <select
          className={selectClass}
          value={row.projectId}
          onChange={(e) => onProjectChange(e.target.value)}
          disabled={disableIdentity}
          aria-label={`Project row ${rowIndex + 1}`}
        >
          <option value="">
            {row.creatorId ? "Select project" : "Select creator first"}
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </td>
      <td className={cn(cell, "min-w-[160px]")}>
        <select
          className={selectClass}
          value={row.campaignObjectiveId}
          onChange={(e) => {
            if (!disableIdentity) patch({ campaignObjectiveId: e.target.value });
          }}
          disabled={disableIdentity}
          aria-label={`Campaign objective row ${rowIndex + 1}`}
        >
          <option value="">
            {row.projectId ? "Select objective" : "Select project first"}
          </option>
          {campaignObjectives.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className={cn(cell, "min-w-[120px]")}>
        <select
          className={selectClass}
          value={row.creatorType}
          onChange={(e) => {
            if (locked) return;
            patch({
              creatorType: e.target.value as CreatorType,
            });
          }}
          disabled={disableIdentity}
          aria-label={`Creator type row ${rowIndex + 1}`}
        >
          <option value="Internal">Internal</option>
          <option value="External">External</option>
          <option value="AssetLoan">Asset Loan</option>
        </select>
      </td>
      <td className={cn(cell, "min-w-[160px]")}>
        <select
          className={selectClass}
          value={row.tiktokAccountId}
          onChange={(e) => {
            if (!disableIdentity) patch({ tiktokAccountId: e.target.value });
          }}
          disabled={disableIdentity || !row.creatorId}
          aria-label={`TikTok account row ${rowIndex + 1}`}
        >
          <option value="">
            {row.creatorId ? "Select TikTok account" : "Select creator first"}
          </option>
          {accountsForCreator.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </td>
      <td className={cn(cell, "min-w-[130px]")}>
        <input
          type="month"
          className={cn(selectClass, "font-sans")}
          value={row.month}
          onChange={(e) => {
            if (!disableIdentity) patch({ month: e.target.value });
          }}
          disabled={disableIdentity}
          aria-label={`Month row ${rowIndex + 1}`}
        />
      </td>
      <td className={cn(cell, "min-w-[280px] align-top")}>
        <VideoUrlsTagInput
          value={row.videoUrls}
          onChange={(videoUrls) => patch({ videoUrls })}
          aria-label={`Video URLs row ${rowIndex + 1}`}
        />
      </td>
      {bulkMode ? (
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
      ) : null}
    </tr>
  );
}

export function videoRowFromTarget(
  t: CreatorTarget,
  brands: Brand[],
  projects: Project[],
): VideoSubmitFormRow {
  const p = projects.find((x) => x.id === t.projectId);
  const br = p?.brandId
    ? brands.find((b) => b.id === p.brandId)
    : undefined;
  const tableSegmentId =
    br?.tableSegmentId === "folo" || br?.tableSegmentId === "tnc"
      ? br.tableSegmentId
      : TABLE_SEGMENT_ALL_ID;
  return {
    targetId: t.id,
    creatorId: t.creatorId,
    tableSegmentId,
    projectId: t.projectId,
    campaignObjectiveId: t.campaignObjectiveId,
    creatorType: t.creatorType,
    tiktokAccountId: t.tiktokAccountId,
    month: t.month,
    videoUrls: "",
  };
}

export function emptyVideoSubmitRow(month: string): VideoSubmitFormRow {
  return {
    targetId: null,
    creatorId: "",
    tableSegmentId: TABLE_SEGMENT_ALL_ID,
    projectId: "",
    campaignObjectiveId: "",
    creatorType: "Internal",
    tiktokAccountId: "",
    month,
    videoUrls: "",
  };
}

/** Baris kosong untuk duplikat: salin identitas, kosongkan URL & targetId. */
export function duplicateVideoRowForBulk(
  row: VideoSubmitFormRow,
): VideoSubmitFormRow {
  return {
    ...row,
    targetId: null,
    videoUrls: "",
  };
}
