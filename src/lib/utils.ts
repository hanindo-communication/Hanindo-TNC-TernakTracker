import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Default IDR (Rupiah). Pass currency e.g. `"USD"` for other locales. */
export function formatCurrency(value: number, currency = "IDR"): string {
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export function labelMonth(key: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(parseMonthKey(key));
}
