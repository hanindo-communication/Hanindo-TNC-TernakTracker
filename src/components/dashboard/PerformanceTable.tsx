"use client";

import {
  DndContext,
  type DragEndEvent,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  CircleHelp,
  Download,
  Eye,
  Film,
  GripVertical,
  Link2,
  Pencil,
  Plus,
  SlidersHorizontal,
  Target,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Creator } from "@/lib/types";
import {
  DEFAULT_HANINDO_SHARING_PERCENT,
  mergeHanindoPercentsFromCreators,
} from "@/lib/dashboard/creator-financial-overrides";
import { splitErForTncHndColumns } from "@/lib/dashboard/financial-rules";
import {
  inferSharingPercentsForEdit,
  usesSharingPercentModel,
} from "@/lib/dashboard/merge-targets";
import { useCreatorHanindoPercents } from "@/hooks/useCreatorHanindoPercents";
import { formatCurrency, labelMonth } from "@/lib/utils";
import {
  type AggregatedCreatorRow,
  type BreakdownRow,
  type TotalRow,
} from "@/hooks/useCreatorDashboard";
import { CreatorTypeChip } from "@/components/dashboard/CreatorTypeChip";
import { EditCreatorTargetsDialog } from "@/components/dashboard/EditCreatorTargetsDialog";
import type { TableSegmentOption } from "@/components/dashboard/QuickFilterChips";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildPerformanceTableCsv,
  downloadCsv,
} from "@/lib/dashboard/export-performance-csv";
import type { CreatorTargetRowSave } from "@/lib/dashboard/merge-targets";
import { AppSelect } from "@/components/ui/app-select";
import {
  filterPlausibleVideoUrls,
  isPlausibleSubmittedVideoUrl,
} from "@/lib/dashboard/video-urls";
import { formatSupabaseClientError } from "@/lib/supabase/format-client-error";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const th =
  "px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/72";

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
  onDeleteCreatorTargets: (creatorId: string) => void | Promise<void>;
  /** Hapus satu baris campaign di breakdown (bukan seluruh creator). */
  onRequestDeleteBreakdownTarget: (payload: {
    targetId: string;
    creatorName: string;
    projectName: string;
  }) => void;
  onReplaceTargetVideoLinks: (
    targetId: string,
    urls: string[],
  ) => void | Promise<void>;
  /** Ubah bulan target (`YYYY-MM`) untuk semua campaign creator di tampilan saat ini. */
  onUpdateCreatorTargetMonth: (
    creatorId: string,
    monthKey: string,
  ) => void | Promise<void>;
  /** Baris creator yang baru disimpan — highlight singkat. */
  highlightedCreatorId?: string | null;
  /** Panggil setelah simpan dari dialog edit / link video agar baris di-highlight. */
  onRequestRowHighlight?: (creatorId: string) => void;
  /** Buka modal Submit Targets (empty state CTA). */
  onOpenSubmitTargets?: () => void;
  /** Bulan tabel (untuk nama file CSV). */
  selectedMonth: string;
  /** Drag-and-drop urutan campaign di breakdown; menyimpan `sort_index` ke Supabase. */
  onReorderBreakdown?: (
    creatorId: string,
    orderedTargetIds: string[],
  ) => void | Promise<void>;
  /** Drag-and-drop urutan baris creator (menyimpan `dashboard_sort_index` di Supabase). */
  onReorderCreatorRows?: (
    orderedCreatorIds: string[],
  ) => void | Promise<void>;
  /** Campaign/proyek untuk dropdown di breakdown (workspace + Data settings). */
  breakdownProjectOptions: { id: string; name: string }[];
}

function breakdownRowToSave(
  b: BreakdownRow,
  patch: Partial<
    Pick<
      CreatorTargetRowSave,
      "targetVideos" | "projectId" | "progressWeekIndex"
    >
  >,
): CreatorTargetRowSave {
  return {
    targetId: b.targetId,
    targetVideos: patch.targetVideos ?? b.targetVideos,
    tableSegmentId: b.tableSegmentId,
    basePay: b.basePay,
    incentivePercent: b.incentivePercent,
    tncSharingPercent: b.tncSharingPercent,
    hndSharingPercent: b.hndSharingPercent,
    ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
    ...(patch.progressWeekIndex !== undefined
      ? { progressWeekIndex: patch.progressWeekIndex }
      : {}),
  };
}

function BreakdownCampaignTargetCells({
  b,
  projectOptions,
  onUpdateTargetRows,
}: {
  b: BreakdownRow;
  projectOptions: { id: string; name: string }[];
  onUpdateTargetRows: (
    updates: CreatorTargetRowSave[],
  ) => void | Promise<void>;
}) {
  const selectOptions = useMemo(() => {
    const byId = new Map(projectOptions.map((p) => [p.id, p]));
    if (!byId.has(b.projectId)) {
      byId.set(b.projectId, { id: b.projectId, name: b.projectName });
    }
    return [...byId.values()].sort((a, x) => a.name.localeCompare(x.name));
  }, [projectOptions, b.projectId, b.projectName]);

  const appOpts = useMemo(
    () => selectOptions.map((p) => ({ value: p.id, label: p.name })),
    [selectOptions],
  );

  const weekSelectOpts = useMemo(
    () =>
      [0, 1, 2, 3].map((w) => ({
        value: String(w),
        label: `Week ${w + 1}`,
      })),
    [],
  );

  return (
    <>
      <td className="min-w-[10rem] px-2 py-2 align-middle">
        {appOpts.length === 0 ? (
          <span className="text-foreground/90">{b.projectName}</span>
        ) : (
          <div onPointerDown={(e) => e.stopPropagation()}>
            <AppSelect
              className="h-8 border-white/10 bg-white/[0.04] text-xs shadow-none"
              value={b.projectId}
              onChange={(projectId) => {
                if (projectId && projectId !== b.projectId) {
                  void onUpdateTargetRows([
                    breakdownRowToSave(b, { projectId }),
                  ]);
                }
              }}
              options={appOpts}
              aria-label="Pilih campaign (Data settings)"
            />
          </div>
        )}
      </td>
      <td className="min-w-[6.5rem] px-2 py-2 align-middle">
        <div onPointerDown={(e) => e.stopPropagation()}>
          <AppSelect
            className="h-8 border-white/10 bg-white/[0.04] text-xs shadow-none"
            value={
              b.progressWeekIndex === null
                ? ""
                : String(b.progressWeekIndex)
            }
            emptyLabel="—"
            onChange={(v) => {
              const next: number | null =
                v === ""
                  ? null
                  : Math.min(3, Math.max(0, parseInt(v, 10) || 0));
              const cur = b.progressWeekIndex;
              if (next !== cur) {
                void onUpdateTargetRows([
                  breakdownRowToSave(b, { progressWeekIndex: next }),
                ]);
              }
            }}
            options={weekSelectOpts}
            aria-label="Minggu untuk Weekly progress (Week 1–4)"
          />
        </div>
      </td>
      <td className="w-[4.5rem] min-w-[4rem] max-w-[6rem] px-2 py-2 align-middle">
        <input
          key={`${b.targetId}-${b.targetVideos}-${b.progressWeekIndex ?? "none"}`}
          type="number"
          min={0}
          step={1}
          defaultValue={b.targetVideos}
          title="Edit target video — Enter atau klik di luar untuk menyimpan ke Supabase"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const v = Math.max(
              0,
              Math.floor(Number(e.currentTarget.value)) || 0,
            );
            if (v !== b.targetVideos) {
              void onUpdateTargetRows([
                breakdownRowToSave(b, { targetVideos: v }),
              ]);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          }}
          className="w-full rounded-md border border-white/10 bg-black/30 px-1.5 py-1 text-xs font-mono text-foreground tabular-nums outline-none focus:border-neon-cyan/50"
        />
      </td>
    </>
  );
}

function PerformanceBreakdownSortableTable({
  creatorId,
  creatorName,
  breakdown,
  videoSubmitSelectedIds,
  onToggleVideoSubmitTarget,
  onToggleAllVideoSubmitTargets,
  onReplaceTargetVideoLinks,
  onRequestRowHighlight,
  hanindoPctByCreator,
  defaultHanindoPct,
  onReorderBreakdown,
  onRequestDeleteBreakdownTarget,
  projectOptions,
  onUpdateTargetRows,
}: {
  creatorId: string;
  creatorName: string;
  breakdown: BreakdownRow[];
  videoSubmitSelectedIds: Set<string>;
  onToggleVideoSubmitTarget: (targetId: string, selected: boolean) => void;
  onToggleAllVideoSubmitTargets: (
    targetIds: string[],
    selected: boolean,
  ) => void;
  onReplaceTargetVideoLinks: (
    targetId: string,
    urls: string[],
  ) => void | Promise<void>;
  onRequestRowHighlight?: (creatorId: string) => void;
  hanindoPctByCreator: Record<string, number>;
  defaultHanindoPct: number;
  onReorderBreakdown?: (
    creatorId: string,
    orderedTargetIds: string[],
  ) => void | Promise<void>;
  onRequestDeleteBreakdownTarget: (payload: {
    targetId: string;
    creatorName: string;
    projectName: string;
  }) => void;
  projectOptions: { id: string; name: string }[];
  onUpdateTargetRows: (
    updates: CreatorTargetRowSave[],
  ) => void | Promise<void>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortableIds = useMemo(
    () => breakdown.map((b) => b.targetId),
    [breakdown],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!onReorderBreakdown) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = sortableIds.indexOf(String(active.id));
      const newIndex = sortableIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(sortableIds, oldIndex, newIndex);
      void onReorderBreakdown(creatorId, next);
    },
    [creatorId, onReorderBreakdown, sortableIds],
  );

  const thead = (
    <thead>
      <tr className="text-[10px] uppercase tracking-wider text-muted">
        <th
          className="w-8 px-1 py-2 text-left"
          title="Seret untuk mengurutkan campaign"
        >
          <span className="sr-only">Urutkan</span>
          <GripVertical
            className="mx-auto h-3.5 w-3.5 opacity-50"
            aria-hidden
          />
        </th>
        <th className="w-10 px-2 py-2 text-left">
          <span className="sr-only">Pilih untuk submit video</span>
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-white/25 bg-white/5 text-neon-cyan focus:ring-neon-cyan/40"
            checked={
              breakdown.length > 0 &&
              breakdown.every((x) => videoSubmitSelectedIds.has(x.targetId))
            }
            ref={(el) => {
              if (!el) return;
              const all =
                breakdown.length > 0 &&
                breakdown.every((x) =>
                  videoSubmitSelectedIds.has(x.targetId),
                );
              const some = breakdown.some((x) =>
                videoSubmitSelectedIds.has(x.targetId),
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
        <th className="whitespace-nowrap px-3 py-2 text-left">Table</th>
        <th className="px-3 py-2 text-left">Campaign</th>
        <th className="whitespace-nowrap px-2 py-2 text-left" title="Terkait modal Weekly progress">
          Week
        </th>
        <th className="px-3 py-2 text-left">Target</th>
        <th className="px-3 py-2 text-left">Submitted</th>
        <th className="px-3 py-2 text-left">Exp. Rev</th>
        <th className="px-3 py-2 text-left">Act. Rev</th>
        <th
          className="whitespace-nowrap px-2 py-2 text-left text-neon-cyan/80"
          title="ER − incentives − [HND] per baris"
        >
          [TNC] Exp.
        </th>
        <th
          className="whitespace-nowrap px-2 py-2 text-left text-neon-purple/80"
          title="15% × ER baris"
        >
          [HND] Exp.
        </th>
        <th className="w-10 px-1 py-2 text-center">
          <span className="sr-only">Hapus baris</span>
        </th>
      </tr>
    </thead>
  );

  const rowProps = {
    videoSubmitSelectedIds,
    onToggleVideoSubmitTarget,
    onReplaceTargetVideoLinks,
    onRequestRowHighlight,
    hanindoPctByCreator,
    defaultHanindoPct,
    creatorName,
    onRequestDeleteBreakdownTarget,
    projectOptions,
    onUpdateTargetRows,
  };

  if (onReorderBreakdown && breakdown.length > 0) {
    return (
      <DndContext
        id="perf-breakdown-rows"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <table className="w-full text-xs">
          {thead}
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {breakdown.map((b) => (
                <SortableBreakdownRow key={b.targetId} row={b} {...rowProps} />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    );
  }

  return (
    <table className="w-full text-xs">
      {thead}
      <tbody>
        {breakdown.map((b) => (
          <StaticBreakdownRow key={b.targetId} row={b} {...rowProps} />
        ))}
      </tbody>
    </table>
  );
}

type BreakdownRowProps = {
  row: BreakdownRow;
  videoSubmitSelectedIds: Set<string>;
  onToggleVideoSubmitTarget: (targetId: string, selected: boolean) => void;
  onReplaceTargetVideoLinks: (
    targetId: string,
    urls: string[],
  ) => void | Promise<void>;
  onRequestRowHighlight?: (creatorId: string) => void;
  hanindoPctByCreator: Record<string, number>;
  defaultHanindoPct: number;
  creatorName: string;
  onRequestDeleteBreakdownTarget: (payload: {
    targetId: string;
    creatorName: string;
    projectName: string;
  }) => void;
  projectOptions: { id: string; name: string }[];
  onUpdateTargetRows: (
    updates: CreatorTargetRowSave[],
  ) => void | Promise<void>;
};

function StaticBreakdownRow({ row: b, ...rest }: BreakdownRowProps) {
  const hndRate =
    (rest.hanindoPctByCreator[b.creatorId] ?? rest.defaultHanindoPct) / 100;
  const usePctRow = usesSharingPercentModel(b);
  const { tncExpectedProfit, hndExpectedProfit } = usePctRow
    ? {
        tncExpectedProfit: b.tncSharingAmount,
        hndExpectedProfit: b.hndSharingAmount,
      }
    : splitErForTncHndColumns(b.expectedRevenue, b.incentives, hndRate);

  return (
    <tr className="border-t border-white/[0.04]">
      <td className="w-8 px-1 py-2 align-middle">
        <span className="inline-block w-7" aria-hidden />
      </td>
      <td className="px-2 py-2 align-middle">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-white/25 bg-white/5 text-neon-cyan focus:ring-neon-cyan/40"
          checked={rest.videoSubmitSelectedIds.has(b.targetId)}
          onChange={(e) =>
            rest.onToggleVideoSubmitTarget(b.targetId, e.target.checked)
          }
          aria-label={`Submit video: ${b.projectName}`}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-muted">
        {b.tableSegmentLabel}
      </td>
      <BreakdownCampaignTargetCells
        b={b}
        projectOptions={rest.projectOptions}
        onUpdateTargetRows={rest.onUpdateTargetRows}
      />
      <td className="px-3 py-2 font-mono">
        <div className="flex items-center gap-1.5">
          <span>{b.submittedVideos}</span>
          <SubmittedVideoLinksPopover
            urls={b.submittedVideoUrls}
            submittedVideos={b.submittedVideos}
            onSave={(urls) =>
              void rest.onReplaceTargetVideoLinks(b.targetId, urls)
            }
            onSaveComplete={() => rest.onRequestRowHighlight?.(b.creatorId)}
          />
        </div>
      </td>
      <td className="px-3 py-2">{formatCurrency(b.expectedRevenue)}</td>
      <td className="px-3 py-2">{formatCurrency(b.actualRevenue)}</td>
      <td className="px-2 py-2 tabular-nums text-neon-cyan/85">
        {formatCurrency(tncExpectedProfit)}
      </td>
      <td className="px-2 py-2 tabular-nums text-neon-purple/85">
        {formatCurrency(hndExpectedProfit)}
      </td>
      <td className="w-10 px-1 py-2 align-middle">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            rest.onRequestDeleteBreakdownTarget({
              targetId: b.targetId,
              creatorName: rest.creatorName,
              projectName: b.projectName,
            });
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-muted transition hover:border-red-400/45 hover:bg-red-500/10 hover:text-red-300"
          title="Hapus baris campaign ini"
          aria-label={`Hapus campaign ${b.projectName}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function SortableBreakdownRow({ row: b, ...rest }: BreakdownRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: b.targetId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : undefined,
    zIndex: isDragging ? 2 : undefined,
    position: "relative" as const,
  };

  const hndRate =
    (rest.hanindoPctByCreator[b.creatorId] ?? rest.defaultHanindoPct) / 100;
  const usePctRow = usesSharingPercentModel(b);
  const { tncExpectedProfit, hndExpectedProfit } = usePctRow
    ? {
        tncExpectedProfit: b.tncSharingAmount,
        hndExpectedProfit: b.hndSharingAmount,
      }
    : splitErForTncHndColumns(b.expectedRevenue, b.incentives, hndRate);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-t border-white/[0.04]",
        isDragging &&
          "bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(50,230,255,0.18)]",
      )}
      {...attributes}
    >
      <td className="w-8 px-1 py-2 align-middle">
        <button
          type="button"
          className="touch-none cursor-grab rounded p-0.5 text-muted transition hover:bg-white/10 hover:text-neon-cyan active:cursor-grabbing"
          aria-label="Seret untuk mengurutkan baris"
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-2 py-2 align-middle">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-white/25 bg-white/5 text-neon-cyan focus:ring-neon-cyan/40"
          checked={rest.videoSubmitSelectedIds.has(b.targetId)}
          onChange={(e) =>
            rest.onToggleVideoSubmitTarget(b.targetId, e.target.checked)
          }
          aria-label={`Submit video: ${b.projectName}`}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-muted">
        {b.tableSegmentLabel}
      </td>
      <BreakdownCampaignTargetCells
        b={b}
        projectOptions={rest.projectOptions}
        onUpdateTargetRows={rest.onUpdateTargetRows}
      />
      <td className="px-3 py-2 font-mono">
        <div className="flex items-center gap-1.5">
          <span>{b.submittedVideos}</span>
          <SubmittedVideoLinksPopover
            urls={b.submittedVideoUrls}
            submittedVideos={b.submittedVideos}
            onSave={(urls) =>
              void rest.onReplaceTargetVideoLinks(b.targetId, urls)
            }
            onSaveComplete={() => rest.onRequestRowHighlight?.(b.creatorId)}
          />
        </div>
      </td>
      <td className="px-3 py-2">{formatCurrency(b.expectedRevenue)}</td>
      <td className="px-3 py-2">{formatCurrency(b.actualRevenue)}</td>
      <td className="px-2 py-2 tabular-nums text-neon-cyan/85">
        {formatCurrency(tncExpectedProfit)}
      </td>
      <td className="px-2 py-2 tabular-nums text-neon-purple/85">
        {formatCurrency(hndExpectedProfit)}
      </td>
      <td className="w-10 px-1 py-2 align-middle">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            rest.onRequestDeleteBreakdownTarget({
              targetId: b.targetId,
              creatorName: rest.creatorName,
              projectName: b.projectName,
            });
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-muted transition hover:border-red-400/45 hover:bg-red-500/10 hover:text-red-300"
          title="Hapus baris campaign ini"
          aria-label={`Hapus campaign ${b.projectName}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function SortableCreatorTbody({
  id,
  disabled,
  groupClassName,
  children,
}: {
  id: string;
  disabled: boolean;
  groupClassName?: string;
  children: (
    dragListeners: DraggableSyntheticListeners | undefined,
  ) => React.ReactNode;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } =
    useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.94 : undefined,
    position: "relative" as const,
  };

  return (
    <tbody
      ref={setNodeRef}
      style={style}
      className={cn(
        groupClassName,
        isDragging &&
          "[&>tr:first-child]:bg-white/[0.05] [&>tr:first-child]:shadow-[inset_0_0_0_1px_rgba(50,230,255,0.22)]",
      )}
      {...attributes}
    >
      {children(disabled ? undefined : listeners)}
    </tbody>
  );
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
  onDeleteCreatorTargets,
  onRequestDeleteBreakdownTarget,
  onReplaceTargetVideoLinks,
  onUpdateCreatorTargetMonth,
  highlightedCreatorId = null,
  onRequestRowHighlight,
  onOpenSubmitTargets,
  selectedMonth,
  onReorderBreakdown,
  onReorderCreatorRows,
  breakdownProjectOptions,
}: PerformanceTableProps) {
  const { snapshot: hanindoLocalSnapshot } = useCreatorHanindoPercents();
  const hanindoPctByCreator = useMemo(
    () => mergeHanindoPercentsFromCreators(creators, hanindoLocalSnapshot),
    [creators, hanindoLocalSnapshot],
  );
  const defaultHanindoPct = DEFAULT_HANINDO_SHARING_PERCENT;
  const sortableCreatorIds = useMemo(
    () => creatorRows.map((r) => r.creatorId),
    [creatorRows],
  );
  const allowCreatorReorder =
    Boolean(onReorderCreatorRows) && creatorRows.length > 1;

  const creatorRowSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onCreatorDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!onReorderCreatorRows || !allowCreatorReorder) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = sortableCreatorIds.indexOf(String(active.id));
      const newIndex = sortableCreatorIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(sortableCreatorIds, oldIndex, newIndex);
      void onReorderCreatorRows(next);
    },
    [allowCreatorReorder, onReorderCreatorRows, sortableCreatorIds],
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editCtx, setEditCtx] = useState<{
    creatorId: string;
    creatorName: string;
    rows: {
      targetId: string;
      projectName: string;
      campaignLabel: string;
      targetVideos: number;
      tableSegmentId: string;
      basePay: number;
      incentivePercent: number;
      tncSharingPercent: number;
      hndSharingPercent: number;
    }[];
  } | null>(null);

  const toggle = (id: string) => {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollFades, setScrollFades] = useState({
    left: false,
    right: false,
  });

  const updateScrollFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setScrollFades({
      left: scrollLeft > 2,
      right: max > 2 && scrollLeft < max - 2,
    });
  }, []);

  useEffect(() => {
    updateScrollFades();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollFades());
    ro.observe(el);
    el.addEventListener("scroll", updateScrollFades, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollFades);
    };
  }, [updateScrollFades, hasRows, creatorRows.length]);

  const onExportCsv = useCallback(() => {
    const csv = buildPerformanceTableCsv({
      creators,
      creatorRows,
      monthKey: selectedMonth,
      includeBreakdown: true,
      breakdownByCreator,
    });
    downloadCsv(`tnc-performa-${selectedMonth}.csv`, csv);
    toast.success("CSV diunduh");
  }, [creators, creatorRows, selectedMonth, breakdownByCreator]);

  if (!hasRows) {
    return (
      <div className="glass-panel neon-border-hover flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl p-10 text-center">
        <div className="rounded-2xl border border-dashed border-neon-purple/30 bg-neon-purple/5 px-6 py-8">
          <p className="text-sm font-medium text-foreground">
            Belum ada target untuk bulan ini.
          </p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Tambah target video lewat form bulk — data langsung tersinkron ke
            workspace bersama.
          </p>
          {onOpenSubmitTargets ? (
            <button
              type="button"
              onClick={onOpenSubmitTargets}
              className="btn-press mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-night bg-gradient-to-r from-neon-cyan via-cyan-300 to-neon-purple shadow-[0_0_24px_rgba(50,230,255,0.3)]"
            >
              <Target className="h-4 w-4" />
              Submit Targets
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent shadow-[0_0_0_1px_rgba(50,230,255,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          <SlidersHorizontal className="h-4 w-4 text-neon-cyan" />
          Creator Performance / Targets
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted transition hover:border-neon-cyan/35 hover:text-neon-cyan"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <TableActionLegend />
        </div>
        <div className="h-px min-w-[40px] flex-1 mx-2 bg-gradient-to-r from-transparent via-neon-cyan/25 to-transparent max-sm:hidden" />
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "perf-table-scroll-wrap overflow-x-auto",
          scrollFades.left && "perf-scroll-fade-left",
          scrollFades.right && "perf-scroll-fade-right",
        )}
      >
        <table className="min-w-[1440px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th
                className={cn(
                  th,
                  "sticky left-0 z-20 min-w-[240px] bg-[#070c18]/95 backdrop-blur",
                )}
                title={
                  allowCreatorReorder
                    ? "Geser baris: pakai ikon grip di kiri Chevron (minimal 2 creator di tabel)."
                    : undefined
                }
              >
                Creator
              </th>
              <th className={th}>Target</th>
              <th className={th}>Submitted</th>
              <th className={cn(th, "min-w-[100px]")} title="Submitted ÷ target">
                Progress
              </th>
              <th className={th}>Expected Revenue</th>
              <th className={th}>Actual Revenue</th>
              <th className={th}>Incentives</th>
              <th className={th}>Reimbursements</th>
              <th
                className={cn(th, "min-w-[108px]")}
                title="ER − incentives − [HND]; dengan ER = incentives + [TNC] + [HND]"
              >
                <span className="block text-[9px] font-semibold normal-case tracking-normal text-neon-cyan/85">
                  [TNC]
                </span>
                <span className="block tracking-[0.14em]">Exp. profit</span>
              </th>
              <th
                className={cn(th, "min-w-[108px]")}
                title="15% × expected revenue (Hanindo); ER = incentives + [TNC] + [HND]"
              >
                <span className="block text-[9px] font-semibold normal-case tracking-normal text-neon-purple/85">
                  [HND]
                </span>
                <span className="block tracking-[0.14em]">Exp. profit</span>
              </th>
              <th
                className={cn(th, "min-w-[118px] whitespace-nowrap")}
                title="Bulan dimana target ini dihitung; ubah untuk memindah baris ke bulan lain"
              >
                Target month
              </th>
            </tr>
          </thead>

          <DndContext
            id="perf-creator-rows"
            sensors={creatorRowSensors}
            collisionDetection={closestCenter}
            onDragEnd={onCreatorDragEnd}
          >
            <SortableContext
              items={sortableCreatorIds}
              strategy={verticalListSortingStrategy}
            >
              {creatorRows.map((row) => {
                const c = creators.find((x) => x.id === row.creatorId);
                if (!c) return null;
                const avatarSrc = (c.avatarUrl ?? "").trim();
                const hasAvatar = avatarSrc.length > 0;
                const open = expanded[row.creatorId];
                const breakdown = breakdownByCreator(row.creatorId);
                const monthForPicker =
                  row.targetMonthKey ??
                  breakdown[0]?.month ??
                  selectedMonth;
                const mixedMonths = row.targetMonthKey === null;

                return (
                  <SortableCreatorTbody
                    key={row.creatorId}
                    id={row.creatorId}
                    disabled={!allowCreatorReorder}
                    groupClassName="group border-b border-white/[0.04] last:border-b-0"
                  >
                    {(dragListeners) => (
                      <>
                <tr
                  className={cn(
                    "relative transition-colors duration-300",
                    "hover:bg-white/[0.04]",
                    "hover:shadow-[inset_0_0_0_1px_rgba(50,230,255,0.14),0_0_24px_rgba(50,230,255,0.06)]",
                    "focus-within:outline-none focus-within:ring-2 focus-within:ring-neon-cyan/35 focus-within:ring-inset",
                    highlightedCreatorId === row.creatorId && "perf-row-saved-flash",
                  )}
                >
                  <td
                    className={cn(
                      "relative sticky left-0 z-10 min-w-[240px] bg-[#070c18]/95 px-3 py-3 backdrop-blur",
                      "border-r border-white/[0.04]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {allowCreatorReorder ? (
                        <button
                          type="button"
                          className="touch-none mt-1 cursor-grab rounded-md p-0.5 text-muted transition hover:bg-white/10 hover:text-neon-cyan active:cursor-grabbing"
                          aria-label="Seret untuk mengurutkan baris creator"
                          title="Uruskan creator"
                          {...(dragListeners ?? {})}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      ) : null}
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
                        <div className="mt-2 grid w-full min-w-0 grid-cols-2 gap-x-1 gap-y-1">
                          <RowMiniAction
                            icon={<Eye className="h-2.5 w-2.5 shrink-0" />}
                            text="Details"
                            onClick={() => onCreatorClick(row.creatorId)}
                          />
                          <RowMiniAction
                            icon={<Film className="h-2.5 w-2.5 shrink-0" />}
                            text="Videos"
                            onClick={() =>
                              onOpenSubmitVideosForCreator(row.creatorId)
                            }
                          />
                          <RowMiniAction
                            icon={<Pencil className="h-2.5 w-2.5 shrink-0" />}
                            text="Edit"
                            onClick={() => {
                              const b = breakdownByCreator(row.creatorId);
                              const hndRate =
                                (hanindoPctByCreator[row.creatorId] ??
                                  defaultHanindoPct) / 100;
                              setEditCtx({
                                creatorId: row.creatorId,
                                creatorName: c.name,
                                rows: b.map((x) => {
                                  const p = inferSharingPercentsForEdit(
                                    x,
                                    hndRate,
                                  );
                                  return {
                                    targetId: x.targetId,
                                    projectName: x.projectName,
                                    campaignLabel: x.campaignLabel,
                                    targetVideos: x.targetVideos,
                                    tableSegmentId: x.tableSegmentId,
                                    basePay: x.basePay,
                                    incentivePercent: p.incentivePercent,
                                    tncSharingPercent: p.tncSharingPercent,
                                    hndSharingPercent: p.hndSharingPercent,
                                  };
                                }),
                              });
                            }}
                          />
                          <RowMiniAction
                            icon={<Trash2 className="h-2.5 w-2.5 shrink-0" />}
                            text="Delete"
                            variant="danger"
                            onClick={() =>
                              void onDeleteCreatorTargets(row.creatorId)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-foreground">
                    {row.targetVideos}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-foreground">
                    <div className="flex items-center justify-start gap-1.5">
                      <span>{row.submittedVideos}</span>
                      {breakdown.length === 1 && breakdown[0] ? (
                        <SubmittedVideoLinksPopover
                          urls={breakdown[0].submittedVideoUrls}
                          submittedVideos={breakdown[0].submittedVideos}
                          onSave={(urls) =>
                            void onReplaceTargetVideoLinks(
                              breakdown[0]!.targetId,
                              urls,
                            )
                          }
                          onSaveComplete={() =>
                            onRequestRowHighlight?.(row.creatorId)
                          }
                        />
                      ) : breakdown.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => toggle(row.creatorId)}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-muted transition hover:border-neon-cyan/40 hover:text-neon-cyan"
                          title="Buka breakdown untuk edit link per campaign"
                          aria-label="Buka breakdown untuk edit link video"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <VideoProgressCell
                      submitted={row.submittedVideos}
                      target={row.targetVideos}
                    />
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
                  <td className="px-3 py-3 text-xs text-neon-cyan/90 tabular-nums">
                    {formatCurrency(row.tncExpectedProfit)}
                  </td>
                  <td className="px-3 py-3 text-xs text-neon-purple/90 tabular-nums">
                    {formatCurrency(row.hndExpectedProfit)}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex min-w-[7.5rem] flex-col gap-1">
                      <input
                        type="month"
                        value={monthForPicker}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (
                            row.targetMonthKey !== null &&
                            v === row.targetMonthKey
                          )
                            return;
                          void onUpdateCreatorTargetMonth(row.creatorId, v);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={
                          mixedMonths
                            ? "Beberapa campaign beda bulan — pilih untuk menyamakan semua ke bulan ini"
                            : "Ubah bulan & tahun target"
                        }
                        className={cn(
                          "w-full max-w-[11rem] cursor-pointer rounded-lg border border-white/15 bg-black/35 px-2 py-1.5 text-[11px] font-medium text-foreground tabular-nums",
                          "outline-none transition hover:border-neon-cyan/40 focus:border-neon-cyan/55 focus:ring-1 focus:ring-neon-cyan/30",
                          mixedMonths && "border-amber-400/35",
                        )}
                      />
                      {mixedMonths ? (
                        <span className="text-[10px] leading-4 text-amber-200/80">
                          Campuran:{" "}
                          {[
                            ...new Set(breakdown.map((b) => b.month)),
                          ]
                            .sort()
                            .map((k) => labelMonth(k))
                            .join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>

                <tr className="border-b-0 bg-white/[0.015]">
                  <td colSpan={11} className="p-0">
                    <div
                      className={cn(
                        "perf-expand-inner grid transition-[grid-template-rows] duration-300 ease-out",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="px-3 pb-4 pt-1">
                          <div className="ml-12 overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
                            <PerformanceBreakdownSortableTable
                              creatorId={row.creatorId}
                              creatorName={c.name}
                              breakdown={breakdown}
                              videoSubmitSelectedIds={videoSubmitSelectedIds}
                              onToggleVideoSubmitTarget={onToggleVideoSubmitTarget}
                              onToggleAllVideoSubmitTargets={
                                onToggleAllVideoSubmitTargets
                              }
                              onReplaceTargetVideoLinks={
                                onReplaceTargetVideoLinks
                              }
                              onRequestRowHighlight={onRequestRowHighlight}
                              hanindoPctByCreator={hanindoPctByCreator}
                              defaultHanindoPct={defaultHanindoPct}
                              onReorderBreakdown={onReorderBreakdown}
                              onRequestDeleteBreakdownTarget={
                                onRequestDeleteBreakdownTarget
                              }
                              projectOptions={breakdownProjectOptions}
                              onUpdateTargetRows={onUpdateTargetRows}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                      </>
                    )}
                  </SortableCreatorTbody>
                );
              })}
            </SortableContext>
          </DndContext>

          {totalRow ? (
            <tfoot>
              <tr className="bg-gradient-to-r from-neon-purple/10 via-transparent to-neon-cyan/10">
                <td className="sticky left-0 z-10 min-w-[240px] bg-[#0a1020]/95 px-3 py-4 text-sm font-bold text-foreground backdrop-blur">
                  Total
                </td>
                <td className="px-3 py-4 text-sm font-bold font-mono">
                  {totalRow.targetVideos}
                </td>
                <td className="px-3 py-4 text-sm font-bold font-mono">
                  {totalRow.submittedVideos}
                </td>
                <td className="px-3 py-4 align-middle">
                  <VideoProgressCell
                    submitted={totalRow.submittedVideos}
                    target={totalRow.targetVideos}
                  />
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
                <td className="px-3 py-4 text-sm font-bold tabular-nums text-neon-cyan">
                  {formatCurrency(totalRow.tncExpectedProfit)}
                </td>
                <td className="px-3 py-4 text-sm font-bold tabular-nums text-neon-purple">
                  {formatCurrency(totalRow.hndExpectedProfit)}
                </td>
                <td className="px-3 py-4 text-xs text-muted">—</td>
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
        creatorId={editCtx?.creatorId ?? ""}
        creatorName={editCtx?.creatorName ?? ""}
        rows={editCtx?.rows ?? []}
        tableSegments={tableSegments}
        onSave={onUpdateTargetRows}
        onSaveSuccess={() => {
          const id = editCtx?.creatorId;
          if (id) onRequestRowHighlight?.(id);
        }}
      />
    </div>
  );
}

function VideoProgressCell({
  submitted,
  target,
}: {
  submitted: number;
  target: number;
}) {
  const pct =
    target <= 0
      ? submitted > 0
        ? 100
        : 0
      : Math.min(100, (submitted / target) * 100);
  const exceeded = target > 0 && submitted > target;
  const label =
    target <= 0
      ? submitted > 0
        ? `${submitted} video dikirim (tanpa kuota target di baris agregat)`
        : "Belum ada kuota target"
      : `${submitted} / ${target} video — ${pct.toFixed(0)}%${exceeded ? " (melebihi target)" : ""}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full min-w-[88px] max-w-[130px] cursor-default py-0.5">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                exceeded
                  ? "bg-gradient-to-r from-amber-400/95 to-neon-purple/90"
                  : "bg-gradient-to-r from-neon-cyan to-cyan-300",
              )}
              style={{ width: `${exceeded ? 100 : pct}%` }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function TableActionLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted transition hover:border-neon-cyan/35 hover:text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/30"
        >
          <CircleHelp className="h-3.5 w-3.5 text-neon-cyan/80" />
          Legenda
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,18rem)] border-white/[0.08] bg-[#0a1020]/98 p-3 text-xs shadow-2xl"
        align="end"
        sideOffset={8}
      >
        <p className="mb-2 font-semibold text-foreground">Ikon aksi baris</p>
        <ul className="space-y-2 text-muted">
          <li className="flex gap-2">
            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-cyan/75" />
            <span>
              <strong className="text-foreground/90">Grip</strong> (kiri chevron)
              — seret untuk mengurutkan baris creator (minimal 2 baris di tabel);
              urutan tersimpan di workspace.
            </span>
          </li>
          <li className="flex gap-2">
            <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-cyan/80" />
            <span>
              <strong className="text-foreground/90">Details</strong> — buka
              drawer ringkasan creator.
            </span>
          </li>
          <li className="flex gap-2">
            <Film className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-cyan/80" />
            <span>
              <strong className="text-foreground/90">Videos</strong> — bulk
              submit URL untuk creator ini.
            </span>
          </li>
          <li className="flex gap-2">
            <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-cyan/80" />
            <span>
              <strong className="text-foreground/90">Edit</strong> — ubah
              target, meja, insentif per campaign.
            </span>
          </li>
          <li className="flex gap-2">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-cyan/80" />
            <span>
              <strong className="text-foreground/90">Link</strong> — daftar URL
              video per target / submitted.
            </span>
          </li>
          <li className="flex gap-2">
            <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300/90" />
            <span>
              <strong className="text-foreground/90">Delete</strong> — hapus
              semua target creator (bulan &amp; filter saat ini).
            </span>
          </li>
          <li className="flex gap-2">
            <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300/90" />
            <span>
              <strong className="text-foreground/90">Hapus di breakdown</strong>{" "}
              — ikon tempat sampah di kolom terkanan tabel per-campaign (satu
              baris saja).
            </span>
          </li>
        </ul>
        <p className="mt-3 border-t border-white/[0.06] pt-2 text-[10px] leading-relaxed text-muted">
          Pintasan:{" "}
          <kbd className="rounded border border-white/15 bg-white/5 px-1 py-px font-mono text-[10px] text-foreground/85">
            Ctrl
          </kbd>
          +
          <kbd className="rounded border border-white/15 bg-white/5 px-1 py-px font-mono text-[10px] text-foreground/85">
            K
          </kbd>{" "}
          — palet perintah (overview, data settings, submit).
        </p>
      </PopoverContent>
    </Popover>
  );
}

function SubmittedVideoLinksPopover({
  urls,
  submittedVideos,
  onSave,
  onSaveComplete,
}: {
  urls: string[];
  submittedVideos: number;
  onSave: (urls: string[]) => void | Promise<void>;
  onSaveComplete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const openedRoundRef = useRef(false);

  useEffect(() => {
    if (!open) {
      openedRoundRef.current = false;
      return;
    }
    if (openedRoundRef.current) return;
    openedRoundRef.current = true;

    const fromServer = filterPlausibleVideoUrls(
      urls.map((u) => String(u).trim()),
    );
    const legacySlots = Math.max(0, submittedVideos - fromServer.length);
    setDraft([...fromServer, ...Array(legacySlots).fill("")]);
    setNewUrl("");
  }, [open, urls, submittedVideos]);

  const patchDraftIdx = (idx: number, value: string) => {
    setDraft((d) => d.map((x, i) => (i === idx ? value : x)));
  };

  const add = () => {
    const s = newUrl.trim();
    if (!s) return;
    if (!isPlausibleSubmittedVideoUrl(s)) {
      toast.error("Bukan URL video yang valid", {
        description:
          "Pakai link TikTok (https://…). Jangan tempel pesan error atau teks panjang dari toast.",
      });
      return;
    }
    setDraft((d) =>
      d.some((x) => x.trim().toLowerCase() === s.toLowerCase()) ? d : [...d, s],
    );
    setNewUrl("");
  };

  const addEmptySlot = () => {
    setDraft((d) => [...d, ""]);
  };

  const save = async () => {
    const cleaned = filterPlausibleVideoUrls(
      draft.map((s) => s.trim()).filter((s) => s.length > 0),
    );
    setSaving(true);
    try {
      await onSave(cleaned);
      onSaveComplete?.();
      setOpen(false);
    } catch (e) {
      toast.error("Gagal menyimpan link", {
        description: formatSupabaseClientError(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const filledCount = draft.filter((s) => s.trim().length > 0).length;
  const hasEmptySlots = draft.some((s) => s.trim().length === 0);
  const storedUrlCount = filterPlausibleVideoUrls(
    urls.map((u) => String(u).trim()),
  ).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-muted transition hover:border-neon-cyan/40 hover:text-neon-cyan"
          title="Edit daftar link video"
          aria-label="Edit daftar link video"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,380px)] min-w-[280px] border-white/[0.08] bg-[#0a1020]/98 p-3 shadow-2xl"
        align="start"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Link video
        </p>
        <p className="mb-3 text-[11px] leading-snug text-muted">
          Hanya link TikTok/URL video yang valid. Teks error atau pesan SQL dari
          toast tidak bisa ditambahkan. Tampilan memuat URL tersimpan di
          database. Satu baris terisi = satu video →{" "}
          <span className="text-foreground/85">Actual revenue</span> ={" "}
          <span className="font-mono text-foreground/80">
            jumlah link × base pay
          </span>
          . <strong className="font-semibold text-foreground/90">Simpan</strong>{" "}
          menyamakan hitungan submit dengan jumlah link yang terisi.
        </p>
        {storedUrlCount === 0 && submittedVideos > 0 ? (
          <p className="mb-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1.5 text-[11px] text-sky-100/90">
            Ada {submittedVideos} submit di data, belum ada URL tersimpan (jalankan{" "}
            <code className="rounded bg-black/30 px-1">npm run db:apply-video-urls</code>{" "}
            jika simpan error). Isi URL pada baris kosong di bawah lalu Simpan.
          </p>
        ) : null}
        {hasEmptySlots && draft.length > 0 ? (
          <p className="mb-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100/90">
            Baris kosong tidak dihitung sampai diisi. Saat ini{" "}
            <span className="font-mono">{filledCount}</span> URL terisi, di meja:{" "}
            <span className="font-mono">{submittedVideos}</span> submitted (sebelum
            simpan).
          </p>
        ) : null}
        <ul className="mb-3 max-h-48 space-y-1.5 overflow-y-auto">
          {draft.length === 0 ? (
            <li className="text-[11px] text-muted">
              Belum ada baris. Tambah URL atau slot kosong.
            </li>
          ) : (
            draft.map((u, idx) => (
              <li
                key={`row-${idx}`}
                className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5"
              >
                {u.trim().length > 0 && isPlausibleSubmittedVideoUrl(u) ? (
                  <a
                    href={u.trim().startsWith("http") ? u.trim() : `https://${u.trim()}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 break-all text-[11px] text-neon-cyan/90 underline-offset-2 hover:underline"
                  >
                    {u.trim()}
                  </a>
                ) : (
                  <input
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    value={u}
                    onChange={(e) => patchDraftIdx(idx, e.target.value)}
                    placeholder="Tempel URL TikTok (slot…)"
                    className="min-w-0 flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-foreground placeholder:text-muted focus:border-neon-cyan/40 focus:outline-none"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => d.filter((_, i) => i !== idx))
                  }
                  className="shrink-0 rounded p-0.5 text-muted hover:bg-red-500/15 hover:text-red-300"
                  aria-label="Hapus baris"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
          <div className="flex min-w-0 flex-1 gap-1.5">
            <input
              type="text"
              inputMode="url"
              autoComplete="off"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Tempel URL TikTok…"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-neon-cyan/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={add}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-neon-cyan/35"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah
            </button>
          </div>
          <button
            type="button"
            onClick={addEmptySlot}
            className="rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-medium text-muted transition hover:border-white/20 hover:text-foreground"
          >
            + Slot kosong
          </button>
        </div>
        <div className="mt-3 flex justify-end gap-2 border-t border-white/[0.06] pt-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg border border-neon-cyan/40 bg-neon-cyan/15 px-3 py-1.5 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/25 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RowMiniAction({
  icon,
  text,
  onClick,
  variant = "default",
}: {
  icon: ReactNode;
  text: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      title={text}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "pointer-events-auto inline-flex w-full min-w-0 max-w-full items-center justify-center gap-0.5 rounded-md border border-white/10 bg-black/40 px-0.5 py-1 text-[8px] font-semibold uppercase leading-none tracking-tight text-foreground/90 shadow-sm backdrop-blur transition sm:text-[9px]",
        variant === "danger"
          ? "hover:border-red-400/45 hover:text-red-300"
          : "hover:border-neon-cyan/40 hover:text-neon-cyan",
      )}
    >
      {icon}
      <span className="min-w-0 max-w-[100%] truncate text-center">{text}</span>
    </button>
  );
}
