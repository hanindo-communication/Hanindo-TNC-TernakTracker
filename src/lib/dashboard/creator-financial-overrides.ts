import { HANINDO_SHARING_RATE_ON_TARGET_REVENUE } from "@/lib/dashboard/financial-rules";

const STORAGE_KEY = "tnc-ternak-creator-hanindo-pct-v1";
const CHANGED = "tnc-ternak-creator-hanindo-pct-changed";

type StoreV1 = { v: 1; byCreatorId: Record<string, number> };

const SERVER_SNAPSHOT: Record<string, number> = {};

export const DEFAULT_HANINDO_SHARING_PERCENT = Math.round(
  HANINDO_SHARING_RATE_ON_TARGET_REVENUE * 100,
);

function clampPercent(p: number): number {
  if (!Number.isFinite(p)) return DEFAULT_HANINDO_SHARING_PERCENT;
  return Math.min(50, Math.max(0, Math.round(p * 10) / 10));
}

function parse(raw: string | null): StoreV1 {
  if (!raw) return { v: 1, byCreatorId: {} };
  try {
    const p = JSON.parse(raw) as StoreV1;
    if (p?.v !== 1 || typeof p.byCreatorId !== "object" || !p.byCreatorId)
      return { v: 1, byCreatorId: {} };
    const byCreatorId: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.byCreatorId)) {
      if (typeof v === "number") byCreatorId[k] = clampPercent(v);
    }
    return { v: 1, byCreatorId };
  } catch {
    return { v: 1, byCreatorId: {} };
  }
}

let memRaw: string | null = null;
let memParsed: StoreV1 = { v: 1, byCreatorId: {} };

function readStore(): StoreV1 {
  if (typeof window === "undefined") return { v: 1, byCreatorId: {} };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === memRaw) return memParsed;
  memRaw = raw;
  memParsed = parse(raw);
  return memParsed;
}

export function getHanindoPercentsSnapshot(): Record<string, number> {
  return readStore().byCreatorId;
}

export function getServerHanindoPercentsSnapshot(): Record<string, number> {
  return SERVER_SNAPSHOT;
}

export function subscribeHanindoPercents(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => onStoreChange();
  window.addEventListener("storage", h);
  window.addEventListener(CHANGED, h);
  return () => {
    window.removeEventListener("storage", h);
    window.removeEventListener(CHANGED, h);
  };
}

export function getHanindoPercentForCreator(creatorId: string): number {
  const v = readStore().byCreatorId[creatorId];
  return v === undefined ? DEFAULT_HANINDO_SHARING_PERCENT : clampPercent(v);
}

export function setHanindoPercentForCreator(
  creatorId: string,
  percent: number,
): void {
  if (typeof window === "undefined") return;
  const cur = readStore();
  const next: StoreV1 = {
    v: 1,
    byCreatorId: {
      ...cur.byCreatorId,
      [creatorId]: clampPercent(percent),
    },
  };
  memRaw = JSON.stringify(next);
  memParsed = next;
  localStorage.setItem(STORAGE_KEY, memRaw);
  window.dispatchEvent(new Event(CHANGED));
}
