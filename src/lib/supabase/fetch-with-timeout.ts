/** Hindari hang abadi jika Supabase/network tidak menjawab (user melihat loading tanpa akhir). */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 25_000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
}
