/** Commit draft string to a non-negative integer (empty → 0). */
export function commitNonNegIntDraft(s: string, min = 0): number {
  const t = s.trim();
  if (t === "") return min;
  return Math.max(min, Math.floor(Number(t)) || 0);
}
