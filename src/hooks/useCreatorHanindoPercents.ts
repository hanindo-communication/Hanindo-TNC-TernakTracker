"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_HANINDO_SHARING_PERCENT,
  getHanindoPercentsSnapshot,
  getServerHanindoPercentsSnapshot,
  setHanindoPercentForCreator,
  subscribeHanindoPercents,
} from "@/lib/dashboard/creator-financial-overrides";

export function useCreatorHanindoPercents() {
  const snapshot = useSyncExternalStore(
    subscribeHanindoPercents,
    getHanindoPercentsSnapshot,
    getServerHanindoPercentsSnapshot,
  );

  const setPercent = useCallback((creatorId: string, percent: number) => {
    setHanindoPercentForCreator(creatorId, percent);
  }, []);

  return {
    snapshot,
    setPercent,
    defaultPercent: DEFAULT_HANINDO_SHARING_PERCENT,
  };
}
