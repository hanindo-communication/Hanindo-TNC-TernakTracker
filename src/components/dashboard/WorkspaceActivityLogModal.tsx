"use client";

import { History, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchWorkspaceActivityLog,
  type WorkspaceActivityRow,
} from "@/lib/dashboard/supabase-data";
import { formatSupabaseClientError } from "@/lib/supabase/format-client-error";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface WorkspaceActivityLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export function WorkspaceActivityLogModal({
  open,
  onOpenChange,
}: WorkspaceActivityLogModalProps) {
  const [rows, setRows] = useState<WorkspaceActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const data = await fetchWorkspaceActivityLog(supabase, 120);
      setRows(data);
    } catch (e) {
      setError(formatSupabaseClientError(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] max-w-lg overflow-hidden border-white/[0.08] bg-[#0a1020]/98 p-0 gap-0 sm:max-w-xl">
        <DialogHeader className="border-b border-white/[0.06] px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-neon-cyan/90" />
            Riwayat perubahan
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Siapa yang menambah, mengubah, atau menghapus data di workspace ini
            (tersimpan saat aksi berhasil).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70vh,480px)] overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted">
              <Loader2 className="h-8 w-8 animate-spin text-neon-cyan/70" />
              <p className="text-sm">Memuat log…</p>
            </div>
          ) : error ? (
            <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200/90">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              Belum ada entri. Setelah Anda menyimpan target, video, atau data
              settings, riwayat akan muncul di sini.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-px",
                        r.action === "delete" &&
                          "bg-red-500/15 text-red-200/95",
                        r.action === "create" && "bg-emerald-500/15 text-emerald-200/95",
                        r.action === "update" && "bg-sky-500/15 text-sky-100/95",
                        r.action === "sync" && "bg-neon-purple/15 text-neon-purple/90",
                        !["delete", "create", "update", "sync"].includes(
                          r.action,
                        ) && "bg-white/10 text-muted",
                      )}
                    >
                      {r.action}
                    </span>
                    <span className="text-muted">{r.entity_type}</span>
                    <span className="ml-auto tabular-nums text-muted normal-case font-medium tracking-normal">
                      {formatWhen(r.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-snug text-foreground/90">
                    {r.summary}
                  </p>
                  <p className="mt-1 break-all text-[11px] text-neon-cyan/75">
                    {r.actor_email?.length
                      ? r.actor_email
                      : "Email tidak tercatat"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
