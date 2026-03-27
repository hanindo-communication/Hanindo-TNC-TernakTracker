"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarRange,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Save,
  Settings2,
  Sparkles,
  Target,
  Upload,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardFilters } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { labelMonth } from "@/lib/utils";
import { cn } from "@/lib/utils";

const filterSelectTriggerClass =
  "h-10 min-w-[140px] rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground shadow-none hover:border-neon-cyan/35 focus:border-neon-cyan/60 focus:ring-2 focus:ring-neon-cyan/30";

interface DashboardHeaderProps {
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  filters: DashboardFilters;
  onFiltersChange: (f: DashboardFilters) => void;
  creatorOptions: { id: string; name: string }[];
  brandOptions: { id: string; name: string }[];
  onSubmitTargets: () => void;
  /** Tampil jika minimal satu campaign terpilih untuk submit video. */
  showSubmitVideos?: boolean;
  onSubmitVideos?: () => void;
  onOverview: () => void;
  onDataSettings: () => void;
  /** Sinkronkan draft Data settings (lokal) ke Supabase + muat ulang bundle. */
  onSaveProject?: () => void;
  saveProjectPending?: boolean;
  /** Buka modal riwayat perubahan workspace. */
  onOpenActivityLog?: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export function DashboardHeader({
  selectedMonth,
  onMonthChange,
  filters,
  onFiltersChange,
  creatorOptions,
  brandOptions,
  onSubmitTargets,
  showSubmitVideos = false,
  onSubmitVideos,
  onOverview,
  onDataSettings,
  onSaveProject,
  saveProjectPending = false,
  onOpenActivityLog,
  userEmail,
  onSignOut,
}: DashboardHeaderProps) {
  const monthInputRef = useRef<HTMLInputElement>(null);

  const openMonthPicker = () => {
    const el = monthInputRef.current;
    if (!el) return;
    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof anyEl.showPicker === "function") {
      try {
        anyEl.showPicker();
        return;
      } catch {
        /* fallback */
      }
    }
    el.focus();
    el.click();
  };

  return (
    <header className="relative flex flex-col gap-6 border-b border-white/[0.07] pb-8">
      <div
        className="pointer-events-none absolute -left-24 top-0 h-40 w-40 rounded-full bg-neon-purple/20 blur-3xl glow-orb"
        aria-hidden
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neon-cyan">
            <Sparkles className="h-3.5 w-3.5" />
            Internal Ops
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Creator Targets &amp; Submissions
          </h1>
          <p className="max-w-xl text-sm text-muted">
            Monitor targets, submissions, incentives, and profit in real time.
          </p>
          <CommandPaletteHintStrip />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="relative flex items-center">
            <input
              ref={monthInputRef}
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              aria-hidden
              tabIndex={-1}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
            />
            <button
              type="button"
              onClick={openMonthPicker}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 neon-border-hover transition hover:border-neon-cyan/35 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-neon-cyan/35"
              title="Pilih bulan & tahun (filter data target)"
              aria-label={`Bulan laporan: ${labelMonth(selectedMonth)}. Buka kalender.`}
            >
              <CalendarRange className="h-4 w-4 shrink-0 text-neon-cyan" />
              <span className="text-sm font-medium text-foreground tabular-nums">
                {labelMonth(selectedMonth)}
              </span>
            </button>
          </div>

          <FilterSelect
            icon={<User className="h-4 w-4" />}
            value={filters.creatorId}
            onChange={(creatorId) =>
              onFiltersChange({ ...filters, creatorId })
            }
            options={[{ id: "all", name: "All creators" }, ...creatorOptions]}
          />
          <FilterSelect
            icon={<Target className="h-4 w-4" />}
            value={filters.brandId}
            onChange={(brandId) => onFiltersChange({ ...filters, brandId })}
            options={[{ id: "all", name: "All brands" }, ...brandOptions]}
          />

          <button
            type="button"
            onClick={onOverview}
            className="action-glow-hover btn-press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neon-cyan/35 bg-neon-cyan/10 px-5 text-sm font-semibold text-neon-cyan hover:bg-neon-cyan/20 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </button>

          <button
            type="button"
            onClick={onDataSettings}
            className="action-glow-hover btn-press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-5 text-sm font-semibold text-foreground hover:border-neon-purple/35 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-neon-purple/30"
          >
            <Settings2 className="h-4 w-4" />
            Data settings
          </button>

          {onSaveProject ? (
            <button
              type="button"
              onClick={onSaveProject}
              disabled={saveProjectPending}
              title="Simpan draft brand / project / creator / TikTok dari Data settings ke Supabase. Target & edit tabel sudah tersimpan otomatis saat Anda mengubahnya."
              className="action-glow-hover btn-press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-5 text-sm font-semibold text-emerald-100/95 transition hover:border-emerald-400/40 hover:bg-emerald-500/18 focus:outline-none focus:ring-2 focus:ring-emerald-400/35 disabled:pointer-events-none disabled:opacity-55"
            >
              {saveProjectPending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Save className="h-4 w-4 shrink-0" />
              )}
              Simpan proyek
            </button>
          ) : null}

          {showSubmitVideos && onSubmitVideos ? (
            <button
              type="button"
              onClick={onSubmitVideos}
              className="btn-press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neon-cyan/45 bg-neon-cyan/12 px-5 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/20 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
            >
              <Upload className="h-4 w-4" />
              Submit Videos
            </button>
          ) : null}

          <div className="inline-flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSubmitTargets}
              className={cn(
                "btn-press inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-night",
                "bg-gradient-to-r from-neon-cyan via-cyan-300 to-neon-purple",
                "shadow-[0_0_32px_rgba(50,230,255,0.35)]",
                "transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-neon-cyan/60",
              )}
            >
              <Target className="h-4 w-4" />
              Submit Targets
            </button>
            {onOpenActivityLog ? (
              <button
                type="button"
                onClick={onOpenActivityLog}
                className="action-glow-hover btn-press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-sm font-semibold text-foreground/90 transition hover:border-neon-cyan/35 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-neon-cyan/30"
                title="Riwayat siapa yang mengubah data workspace"
              >
                <History className="h-4 w-4 shrink-0 text-neon-cyan/85" />
                Log
              </button>
            ) : null}
          </div>

          {userEmail ? (
            <div className="mt-2 flex flex-col items-stretch gap-2 sm:mt-3 sm:items-end sm:self-end">
              <span className="max-w-[220px] truncate text-right text-xs text-muted">
                {userEmail}
              </span>
              {onSignOut ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-xs font-semibold uppercase tracking-wide text-muted transition hover:border-red-400/40 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

const CMDK_HINT_STORAGE = "tnc-ternak-cmdk-hint-dismissed";

function CommandPaletteHintStrip() {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setDismissed(window.localStorage.getItem(CMDK_HINT_STORAGE) === "1");
      } catch {
        /* ignore */
      }
      setReady(true);
    });
  }, []);

  if (!ready || dismissed) return null;

  return (
    <div
      className="mt-4 flex flex-col gap-2 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="text-xs text-foreground/90">
        <span className="font-semibold text-neon-cyan/95">Cepat:</span> tekan{" "}
        <kbd className="rounded border border-white/20 bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-foreground/90">
          Ctrl
        </kbd>
        +
        <kbd className="rounded border border-white/20 bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-foreground/90">
          K
        </kbd>{" "}
        untuk palet perintah (overview, data settings, submit targets/video).
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(CMDK_HINT_STORAGE, "1");
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
        className="shrink-0 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-foreground/90 transition hover:border-neon-cyan/40 hover:bg-white/[0.1]"
      >
        Mengerti, sembunyikan
      </button>
    </div>
  );
}

function FilterSelect({
  icon,
  value,
  onChange,
  options,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <div className="relative min-w-[140px]">
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted">
        {icon}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(filterSelectTriggerClass, "w-full pl-9 pr-8")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={6} align="start">
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
