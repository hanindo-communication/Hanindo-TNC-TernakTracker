import type { Brand, Creator, Project, TikTokAccount } from "@/lib/types";
import { normalizeBrandTableSegment } from "@/lib/dashboard/table-segments";
import { addMonthsToMonthKey } from "@/lib/utils";

/** Entitas tambahan dari Data settings (localStorage), digabung ke data workspace untuk form. */
export interface StoredFormEntities {
  v: 1;
  brands: Brand[];
  projects: Project[];
  creators: Creator[];
  tiktokAccounts: TikTokAccount[];
}

const STORAGE_KEY = "tnc-ternak-form-entities-v1";

const FORM_ENTITIES_CHANGED = "tnc-ternak-form-entities-changed";

/** Snapshot stabil untuk SSR (useSyncExternalStore getServerSnapshot). */
const SERVER_SNAPSHOT: StoredFormEntities = {
  v: 1,
  brands: [],
  projects: [],
  creators: [],
  tiktokAccounts: [],
};

const MAX_MONTH_TRAVERSE = 360;

interface ParsedV2Store {
  byMonth: Record<string, StoredFormEntities>;
  migratedV1Seed?: StoredFormEntities;
}

function normalizeStoredFormEntitiesLoose(p: unknown): StoredFormEntities {
  try {
    const o = p as StoredFormEntities;
    if (o?.v !== 1) return { ...SERVER_SNAPSHOT };
    const rawBrands = Array.isArray(o.brands) ? o.brands : [];
    const brands: Brand[] = rawBrands.map((b) =>
      normalizeBrandTableSegment({
        id: String((b as Brand).id),
        name: String((b as Brand).name ?? ""),
        tableSegmentId:
          (b as Brand).tableSegmentId === "folo" ? "folo" : "tnc",
      }),
    );
    return {
      v: 1,
      brands,
      projects: Array.isArray(o.projects) ? o.projects : [],
      creators: Array.isArray(o.creators) ? o.creators : [],
      tiktokAccounts: Array.isArray(o.tiktokAccounts) ? o.tiktokAccounts : [],
    };
  } catch {
    return { ...SERVER_SNAPSHOT };
  }
}

function cloneStoredFormEntities(s: StoredFormEntities): StoredFormEntities {
  return structuredClone(s);
}

function parseStoredV1(raw: string): StoredFormEntities | null {
  try {
    const p = JSON.parse(raw) as { v?: number };
    if (p.v !== 1) return null;
    return normalizeStoredFormEntitiesLoose(p);
  } catch {
    return null;
  }
}

function parseStoredV2(raw: string): ParsedV2Store | null {
  try {
    const p = JSON.parse(raw) as {
      v?: number;
      byMonth?: Record<string, unknown>;
      migratedV1Seed?: unknown;
    };
    if (p.v !== 2 || !p.byMonth || typeof p.byMonth !== "object") return null;
    const byMonth: Record<string, StoredFormEntities> = {};
    for (const [k, v] of Object.entries(p.byMonth)) {
      byMonth[k] = normalizeStoredFormEntitiesLoose(v);
    }
    const migratedV1Seed =
      p.migratedV1Seed != null
        ? normalizeStoredFormEntitiesLoose(p.migratedV1Seed)
        : undefined;
    return { byMonth, migratedV1Seed };
  } catch {
    return null;
  }
}

function readLocalStorageRaw(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function migrateLegacyV1ToV2Store(v1: StoredFormEntities): ParsedV2Store {
  return { byMonth: {}, migratedV1Seed: cloneStoredFormEntities(v1) };
}

let memRaw: string | null = null;
let memV2: ParsedV2Store = { byMonth: {} };
/** memo getEffectiveStoredFormEntities per raw string */
const effectiveMemo = new Map<string, StoredFormEntities>();

function readMemParsed(): ParsedV2Store {
  if (typeof window === "undefined") return { byMonth: {} };
  const raw = readLocalStorageRaw();
  if (raw === memRaw) return memV2;

  memRaw = raw;
  effectiveMemo.clear();

  if (!raw) {
    memV2 = { byMonth: {} };
    return memV2;
  }

  const asV2 = parseStoredV2(raw);
  if (asV2) {
    memV2 = asV2;
    return memV2;
  }

  const asV1 = parseStoredV1(raw);
  if (asV1) {
    memV2 = migrateLegacyV1ToV2Store(asV1);
    persistV2Store(memV2);
    return memV2;
  }

  memV2 = { byMonth: {} };
  return memV2;
}

function persistV2Store(store: ParsedV2Store): void {
  if (typeof window === "undefined") return;
  const payload = {
    v: 2 as const,
    byMonth: store.byMonth,
    ...(store.migratedV1Seed
      ? { migratedV1Seed: store.migratedV1Seed }
      : {}),
  };
  const json = JSON.stringify(payload);
  localStorage.setItem(STORAGE_KEY, json);
  memRaw = json;
  memV2 = store;
  effectiveMemo.clear();
  window.dispatchEvent(new Event(FORM_ENTITIES_CHANGED));
}

function effectiveFromStore(
  monthKey: string,
  store: ParsedV2Store,
  depth: number,
): StoredFormEntities {
  if (depth > MAX_MONTH_TRAVERSE) {
    return store.migratedV1Seed
      ? cloneStoredFormEntities(store.migratedV1Seed)
      : { ...SERVER_SNAPSHOT };
  }

  if (Object.prototype.hasOwnProperty.call(store.byMonth, monthKey)) {
    return cloneStoredFormEntities(store.byMonth[monthKey]!);
  }

  const prev = addMonthsToMonthKey(monthKey, -1);
  if (prev === monthKey) {
    return store.migratedV1Seed
      ? cloneStoredFormEntities(store.migratedV1Seed)
      : { ...SERVER_SNAPSHOT };
  }

  return effectiveFromStore(prev, store, depth + 1);
}

export function emptyStoredFormEntities(): StoredFormEntities {
  return {
    v: 1,
    brands: [],
    projects: [],
    creators: [],
    tiktokAccounts: [],
  };
}

export function getEffectiveStoredFormEntities(monthKey: string): StoredFormEntities {
  const store = readMemParsed();
  const memoKey = `${memRaw ?? ""}::${monthKey}`;
  const hit = effectiveMemo.get(memoKey);
  if (hit) return hit;
  const computed = effectiveFromStore(monthKey, store, 0);
  effectiveMemo.set(memoKey, computed);
  return computed;
}

/** @deprecated Gunakan getEffectiveStoredFormEntities(monthKey) */
export function loadStoredFormEntities(): StoredFormEntities {
  if (typeof window === "undefined") return { ...SERVER_SNAPSHOT };
  const store = readMemParsed();
  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return getEffectiveStoredFormEntities(fallbackMonth);
}

/** Untuk useSyncExternalStore: subscribe ke perubahan localStorage (tab ini + tab lain). */
export function subscribeStoredFormEntities(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      memRaw = null;
      effectiveMemo.clear();
      onChange();
    }
  };
  const onLocal = () => {
    memRaw = null;
    effectiveMemo.clear();
    onChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(FORM_ENTITIES_CHANGED, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FORM_ENTITIES_CHANGED, onLocal);
  };
}

export function getStoredFormEntitiesSnapshotForMonth(
  monthKey: string,
): StoredFormEntities {
  return getEffectiveStoredFormEntities(monthKey);
}

export function getServerStoredFormSnapshot(): StoredFormEntities {
  return SERVER_SNAPSHOT;
}

export function saveStoredFormEntitiesForMonth(
  monthKey: string,
  s: StoredFormEntities,
): void {
  if (typeof window === "undefined") return;
  const store = readMemParsed();
  const next: ParsedV2Store = {
    byMonth: {
      ...store.byMonth,
      [monthKey]: normalizeStoredFormEntitiesLoose(s),
    },
    migratedV1Seed: store.migratedV1Seed,
  };
  persistV2Store(next);
}

/** Simpan hanya untuk bulan ini; bulan lain tidak berubah. */
export function saveStoredFormEntities(s: StoredFormEntities): void {
  if (typeof window === "undefined") return;
  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  saveStoredFormEntitiesForMonth(fallbackMonth, s);
}
