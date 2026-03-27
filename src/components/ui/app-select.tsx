"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SELECT_EMPTY_VALUE,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AppSelectOption = { value: string; label: string };

export function AppSelect({
  value,
  onChange,
  options,
  emptyLabel,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  /** Jika diisi, menambah opsi pertama dengan value internal `""` untuk Radix. */
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const withEmpty = emptyLabel != null;
  const rootValue = withEmpty && value === "" ? SELECT_EMPTY_VALUE : value;

  return (
    <Select
      value={rootValue}
      onValueChange={(v) => onChange(v === SELECT_EMPTY_VALUE ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger className={cn(className)} aria-label={ariaLabel}>
        <SelectValue placeholder={emptyLabel} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {withEmpty ? (
          <SelectItem value={SELECT_EMPTY_VALUE}>{emptyLabel}</SelectItem>
        ) : null}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
