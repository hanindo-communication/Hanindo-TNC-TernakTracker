"use client";

import {
  ChevronRight,
  Eye,
  Film,
  Pencil,
  SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { Creator } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import type {
  AggregatedCreatorRow,
  BreakdownRow,
  TotalRow,
} from "@/hooks/useCreatorDashboard";
import { CreatorTypeChip } from "@/components/dashboard/CreatorTypeChip";
import { EditCreatorTargetsDialog } from "@/components/dashboard/EditCreatorTargetsDialog";
import type { TableSegmentOption } from "@/components/dashboard/QuickFilterChips";
import type { CreatorTargetRowSave } from "@/lib/dashboard/merge-targets";
import { cn } from "@/lib/utils";

const th =
  "px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted";

interface PerformanceTableProps {
  creators: Creator[];
  creatorRows: AggregatedCreatorRow[];
  breakdownByCreator: (creatorId: string) => BreakdownRow[];
  totalRow: TotalRow | null;
  hasRows: boolean;
  onCreatorClick: (creatorId: string) => void;
  onUpdateTargetRows: (
    updates: CreatorTargetRowSave[],
  ) => void | Promise<void>;
  tableSegments: TableSegmentOption[];
  videoSubmitSelectedIds: Set<string>;
  onToggleVideoSubmitTarget: (targetId: string, selected: boolean) => void;
  onToggleAllVideoSubmitTargets: (
    targetIds: string[],
    selected: boolean,
  ) => void;
  onOpenSubmitVideosForCreator: (creatorId: string) => void;
}

export function PerformanceTable({
  creators,
  creatorRows,
  breakdownByCreator,
  totalRow,
  hasRows,
  onCreatorClick,
  onUpdateTargetRows,
  tableSegments,
  videoSubmitSelectedIds,
  onToggleVideoSubmitTarget,
  onToggleAllVideoSubmitTargets,
  onOpenSubmitVideosForCreator,
}: PerformanceTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editCtx, setEditCtx] = useState<{
    creatorName: string;
    rows: {
      targetId: string;
      projectName: string;
      campaignLabel: string;
      targetVideos: number;
      tableSegmentId: string;
      basePay: number;
      incentivePerVideo: number;
    }[];
  } | null>(null);

  const toggle = (id: string) => {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  };

  if (!hasRows) {
    return (
      <div className="glass-panel neon-border-hover flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl p-10 text-center">
        <div className="rounded-2xl border border-dashed border-neon-purple/30 bg-neon-purple/5 px-6 py-8">
          <p className="text-sm font-medium text-foreground">
            No targets set for this month yet.
          </p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Click &quot;Submit Targets&quot; to define video targets and sync them
            to this dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent shadow-[0_0_0_1px_rgba(50,230,255,0.06)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          <SlidersHorizontal className="h-4 w-4 text-neon-cyan" />
          Creator Performance / Targets
        </div>
        <div className="h-px flex-1 mx-6 bg-gradient-to-r from-transparent via-neon-cyan/25 to-transparent" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className={cn(th, "sticky left-0 z-20 min-w-[220px] bg-[#070c18]/95 backdrop-blur")}>
                Creator
              </th>
              <th className={th}>Target</th>
              <th className={th}>Submitted</th>
              <th className={th}>Expected Revenue</th>
              <th className={th}>Actual Revenue</th>
              <th className={th}>Incentives</th>
              <th className={th}>Reimbursements</th>
              <th className={th}>Expected Profit</th>
            </tr>
          </thead>

          {creatorRows.map((row) => {
            const c = creators.find((x) => x.id === row.creatorId);
            if (!c) return null;
            const avatarSrc = (c.avatarUrl ?? "").trim();
            const hasAvatar = avatarSrc.length > 0;
            const open = expanded[row.creatorId];
            const breakdown = breakdownByCreator(row.creatorId);

            return (
              <tbody
                key={row.creatorId}
                className="group border-b border-white/[0.04] last:border-b-0"
              >
                <tr
                  className={cn(
                    "relative transition-colors duration-300",
                    "hover:bg-white/[0.04]",
                    "hover:shadow-[inset_0_0_0_1px_rgba(50,230,255,0.14),0_0_24px_rgba(50,230,255,0.06)]",
                  )}
                >
                  <td
                    className={cn(
                      "relative sticky left-0 z-10 min-w-[220px] bg-[#070c18]/95 px-3 py-3 backdrop-blur",
                      "border-r border-white/[0.04]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggle(row.creatorId)}
                        className="mt-1 rounded-md p-0.5 text-muted transition hover:bg-white/5 hover:text-neon-cyan"
                        aria-expanded={open}
                        aria-label={open ? "Collapse breakdown" : "Expand breakdown"}
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            open && "rotate-90",
                          )}
                        />
                      </button>
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-neon-cyan/25 shadow-[0_0_20px_rgba(50,230,255,0.15)]">
                        {hasAvatar ? (
                          <Image
                            src={avatarSrc}
                            alt={c.name}
                            width={40}
                            height={40}
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 text-sm font-bold text-foreground/80"
                            aria-hidden
                          >
                            {(c.name.trim().slice(0, 1) || "?").toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onCreatorClick(row.creatorId)}
                          className="block truncate text-left font-medium text-foreground underline-offset-4 transition hover:text-neon-cyan hover:underline"
                        >
                          {c.name}
                        </button>
                        <div className="mt-1">
                          <CreatorTypeChip type={c.creatorType} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <RowMiniAction
                            icon={<Eye className="h-3 w-3" />}
                            text="Details"
                            onClick={() => onCreatorClick(row.creatorId)}
                          />
                          <RowMiniAction
                            icon={<Film className="h-3 w-3" />}
                            text="Videos"
                            onClick={() =>
                              onOpenSubmitVideosForCreator(row.creatorId)
                            }
                          />
                          <RowMiniAction
                            icon={<Pencil className="h-3 w-3" />}
                            text="Edit"
                            onClick={() => {
                              const b = breakdownByCreator(row.creatorId);
                              setEditCtx({
                                creatorName: c.name,
                                rows: b.map((x) => ({
                                  targetId: x.targetId,
                                  projectName: x.projectName,
                                  campaignLabel: x.campaignLabel,
                                  targetVideos: x.targetVideos,
                                  tableSegmentId: x.tableSegmentId,
                                  basePay: x.basePay,
                                  incentivePerVideo: x.incentivePerVideo,
                                })),
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-foreground">
                    {row.targetVideos}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-foreground">
                    {row.submittedVideos}
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground/90">
                    {formatCurrency(row.expectedRevenue)}
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground/90">
                    {formatCurrency(row.actualRevenue)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {formatCurrency(row.incentives)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {formatCurrency(row.reimbursements)}
                  </td>
                  <td className="px-3 py-3 text-xs text-neon-purple/90">
                    {formatCurrency(row.expectedProfit)}
                  </td>
                </tr>

                <tr className="border-b-0 bg-white/[0.015]">
                  <td colSpan={8} className="p-0">
                    <div
                      className={cn(
                        "perf-expand-inner grid transition-[grid-template-rows] duration-300 ease-out",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="px-3 pb-4 pt-1">
                          <div className="ml-12 overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[10px] uppercase tracking-wider text-muted">
                                  <th className="w-10 px-2 py-2 text-left">
                                    <span className="sr-only">
                                      Pilih untuk submit video
                                    </span>
                                    <input
                                      type="checkbox"
                                      className="h-3.5 w-3.5 rounded border-white/25 bg-white/5 text-neon-cyan focus:ring-neon-cyan/40"
                                      checked={
                                        breakdown.length > 0 &&
                                        breakdown.every((x) =>
                                          videoSubmitSelectedIds.has(
                                            x.targetId,
                                          ),
                                        )
                                      }
                                      ref={(el) => {
                                        if (!el) return;
                                        const all =
                                          breakdown.length > 0 &&
                                          breakdown.every((x) =>
                                            videoSubmitSelectedIds.has(
                                              x.targetId,
                                            ),
                                          );
                                        const some = breakdown.some((x) =>
                                          videoSubmitSelectedIds.has(
                                            x.targetId,
                                          ),
                                        );
                                        el.indeterminate = some && !all;
                                      }}
                                      onChange={(e) =>
                                        onToggleAllVideoSubmitTargets(
                                          breakdown.map((x) => x.targetId),
                                          e.target.checked,
                                        )
                                      }
                                      aria-label="Pilih semua campaign untuk submit video"
                                    />
                                  </th>
                                  <th className="whitespace-nowrap px-3 py-2 text-left">
                                    Table
                                  </th>
                                  <th className="px-3 py-2 text-left">
                                    Campaign
                                  </th>
                                  <th className="px-3 py-2 text-left">
                                    Target
                                  </th>
                                  <th className="px-3 py-2 text-left">
                                    Submitted
                                  </th>
                                  <th className="px-3 py-2 text-left">
                                    Exp. Rev
                                  </th>
                                  <th className="px-3 py-2 text-left">
                                    Act. Rev
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {breakdown.map((b) => (
                                  <tr
                                    key={b.targetId}
                                    className="border-t border-white/[0.04]"
                                  >
                                    <td className="px-2 py-2 align-middle">
                                      <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 rounded border-white/25 bg-white/5 text-neon-cyan focus:ring-neon-cyan/40"
                                        checked={videoSubmitSelectedIds.has(
                                          b.targetId,
                                        )}
                                        onChange={(e) =>
                                          onToggleVideoSubmitTarget(
                                            b.targetId,
                                            e.target.checked,
                                          )
                                        }
                                        aria-label={`Submit video: ${b.projectName}`}
                                      />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                                      {b.tableSegmentLabel}
                                    </td>
                                    <td className="px-3 py-2 text-foreground/90">
                                      {b.projectName}
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                      {b.targetVideos}
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                      {b.submittedVideos}
                                    </td>
                                    <td className="px-3 py-2">
                                      {formatCurrency(b.expectedRevenue)}
                                    </td>
                                    <td className="px-3 py-2">
                                      {formatCurrency(b.actualRevenue)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            );
          })}

          {totalRow ? (
            <tfoot>
              <tr className="bg-gradient-to-r from-neon-purple/10 via-transparent to-neon-cyan/10">
                <td className="sticky left-0 z-10 bg-[#0a1020]/95 px-3 py-4 text-sm font-bold text-foreground backdrop-blur">
                  Total
                </td>
                <td className="px-3 py-4 text-sm font-bold font-mono">
                  {totalRow.targetVideos}
                </td>
                <td className="px-3 py-4 text-sm font-bold font-mono">
                  {totalRow.submittedVideos}
                </td>
                <td className="px-3 py-4 text-sm font-bold">
                  {formatCurrency(totalRow.expectedRevenue)}
                </td>
                <td className="px-3 py-4 text-sm font-bold">
                  {formatCurrency(totalRow.actualRevenue)}
                </td>
                <td className="px-3 py-4 text-sm font-bold">
                  {formatCurrency(totalRow.incentives)}
                </td>
                <td className="px-3 py-4 text-sm font-bold">
                  {formatCurrency(totalRow.reimbursements)}
                </td>
                <td className="px-3 py-4 text-sm font-bold text-neon-purple">
                  {formatCurrency(totalRow.expectedProfit)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <EditCreatorTargetsDialog
        open={editCtx !== null}
        onOpenChange={(o) => {
          if (!o) setEditCtx(null);
        }}
        creatorName={editCtx?.creatorName ?? ""}
        rows={editCtx?.rows ?? []}
        tableSegments={tableSegments}
        onSave={onUpdateTargetRows}
      />
    </div>
  );
}

function RowMiniAction({
  icon,
  text,
  onClick,
}: {
  icon: ReactNode;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/90 shadow-sm backdrop-blur transition hover:border-neon-cyan/40 hover:text-neon-cyan"
    >
      {icon}
      {text}
    </button>
  );
}
