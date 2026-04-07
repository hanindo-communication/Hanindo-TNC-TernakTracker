"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getServerStoredFormSnapshot,
  getStoredFormEntitiesSnapshotForMonth,
  saveStoredFormEntitiesForMonth,
  subscribeStoredFormEntities,
  type StoredFormEntities,
} from "@/lib/dashboard/form-settings-storage";

export function useFormSettings(monthKey: string) {
  const stored = useSyncExternalStore(
    subscribeStoredFormEntities,
    () => getStoredFormEntitiesSnapshotForMonth(monthKey),
    getServerStoredFormSnapshot,
  );

  const persist = useCallback(
    (next: StoredFormEntities) => {
      saveStoredFormEntitiesForMonth(monthKey, next);
    },
    [monthKey],
  );

  return { stored, persist };
}
