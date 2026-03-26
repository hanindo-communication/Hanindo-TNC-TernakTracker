/** Hitung entri video dari teks (satu URL per baris atau dipisah koma). */
export function countVideoUrlLines(text: string): number {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}
