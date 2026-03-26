"use client";

import { useEffect, useState } from "react";
import { commitNonNegIntDraft } from "@/lib/dashboard/optional-non-neg-int";

interface OptionalNonNegIntInputProps {
  value: number;
  onCommit: (n: number) => void;
  /** Dipanggil saat angka valid berubah (tanpa tunggu blur) — berguna untuk form yang simpan langsung. */
  onLiveUpdate?: (n: number) => void;
  className?: string;
  min?: number;
  "aria-label"?: string;
}

function draftFromValue(value: number, min: number): string {
  if (min === 0 && value === 0) return "";
  return String(value);
}

/**
 * Integer ≥ min; allows empty while editing; strips leading zeros as you type;
 * when min is 0, committed 0 shows as empty (not "0").
 */
export function OptionalNonNegIntInput({
  value,
  onCommit,
  onLiveUpdate,
  className,
  min = 0,
  "aria-label": ariaLabel,
}: OptionalNonNegIntInputProps) {
  const [draft, setDraft] = useState(() => draftFromValue(value, min));

  useEffect(() => {
    setDraft(draftFromValue(value, min));
  }, [value, min]);

  const commit = () => {
    const n = commitNonNegIntDraft(draft, min);
    onCommit(n);
    setDraft(draftFromValue(n, min));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={draft}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") {
          setDraft("");
          return;
        }
        if (!/^\d+$/.test(v)) return;
        const n = parseInt(v, 10);
        setDraft(String(n));
        onLiveUpdate?.(n);
      }}
      onBlur={commit}
      aria-label={ariaLabel}
    />
  );
}
