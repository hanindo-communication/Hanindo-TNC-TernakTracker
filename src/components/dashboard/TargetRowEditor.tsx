"use client";

import { Trash2 } from "lucide-react";
import type {
  Creator,
  CreatorType,
  Project,
  TargetFormRow,
  TikTokAccount,
} from "@/lib/types";
import { CreatorPicker } from "@/components/dashboard/CreatorPicker";
import { OptionalNonNegIntInput } from "@/components/dashboard/OptionalNonNegIntInput";
import { AppSelect } from "@/components/ui/app-select";
import { CREATOR_TYPE_SELECT_OPTIONS } from "@/lib/dashboard/creator-type-options";

const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground outline-none transition focus:border-neon-cyan/55 focus:ring-2 focus:ring-neon-cyan/20";

const rowSelectTriggerClass =
  "h-10 w-full rounded-lg border-white/10 bg-white/[0.04] px-3 text-sm shadow-none hover:border-white/15 focus:border-neon-cyan/55 focus:ring-2 focus:ring-neon-cyan/20";

interface TargetRowEditorProps {
  row: TargetFormRow;
  rowIndex: number;
  onChange: (next: TargetFormRow) => void;
  onRemove?: () => void;
  creators: Creator[];
  projects: Project[];
  tiktokAccounts: TikTokAccount[];
  defaultBasePay: (type: CreatorType) => number;
}

export function TargetRowEditor({
  row,
  rowIndex,
  onChange,
  onRemove,
  creators,
  projects,
  tiktokAccounts,
  defaultBasePay,
}: TargetRowEditorProps) {
  const accountsForCreator = tiktokAccounts.filter(
    (t) => t.creatorId === row.creatorId,
  );

  const patch = (partial: Partial<TargetFormRow>) => {
    onChange({ ...row, ...partial });
  };

  const onCreatorChange = (creatorId: string) => {
    const c = creators.find((x) => x.id === creatorId);
    const firstTt = tiktokAccounts.find((t) => t.creatorId === creatorId);
    patch({
      creatorId,
      creatorType: c?.creatorType ?? row.creatorType,
      tiktokAccountId: firstTt?.id ?? "",
      basePay: c ? defaultBasePay(c.creatorType) : row.basePay,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 md:grid-cols-12 md:items-end">
      <div className="md:col-span-2">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Creator
        </label>
        <CreatorPicker
          creators={creators}
          value={row.creatorId}
          onChange={onCreatorChange}
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Campaign
        </label>
        <AppSelect
          className={rowSelectTriggerClass}
          value={row.projectId}
          onChange={(projectId) => patch({ projectId })}
          emptyLabel="Select campaign…"
          options={projects.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Creator type
        </label>
        <AppSelect
          className={rowSelectTriggerClass}
          value={row.creatorType}
          onChange={(v) => {
            const creatorType = v as CreatorType;
            patch({
              creatorType,
              basePay: defaultBasePay(creatorType),
            });
          }}
          options={[...CREATOR_TYPE_SELECT_OPTIONS]}
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          TikTok account
        </label>
        <AppSelect
          className={rowSelectTriggerClass}
          value={row.tiktokAccountId}
          onChange={(tiktokAccountId) => patch({ tiktokAccountId })}
          disabled={!row.creatorId}
          emptyLabel="Select…"
          options={accountsForCreator.map((t) => ({
            value: t.id,
            label: t.label,
          }))}
        />
      </div>

      <div className="md:col-span-1">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Month
        </label>
        <input
          type="month"
          className={inputClass}
          value={row.month}
          onChange={(e) => patch({ month: e.target.value })}
        />
      </div>

      <div className="md:col-span-1">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Target
        </label>
        <OptionalNonNegIntInput
          className={inputClass}
          value={row.targetVideos}
          onCommit={(n) => patch({ targetVideos: n })}
        />
      </div>

      <div className="md:col-span-1">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Incentive / vid
        </label>
        <OptionalNonNegIntInput
          className={inputClass}
          value={row.incentivePerVideo}
          onCommit={(n) => patch({ incentivePerVideo: n })}
        />
      </div>

      <div className="md:col-span-1">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Base pay
        </label>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={row.basePay}
          onChange={(e) => patch({ basePay: Number(e.target.value) || 0 })}
        />
      </div>

      <div className="md:col-span-12 flex items-center justify-between pt-1">
        <p className="text-[10px] text-muted">
          Row <span className="font-mono text-foreground/80">{rowIndex + 1}</span>
        </p>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted transition hover:border-red-400/40 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
