"use client";

import { useEffect, useState } from "react";

/** Normalized [-1, 1] from pointer; multiply in UI by px for subtle parallax. */
export function usePointerParallax(enabled: boolean) {
  const [n, setN] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setN({ x: 0, y: 0 });
      return;
    }
    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      setN({
        x: (e.clientX / w) * 2 - 1,
        y: (e.clientY / h) * 2 - 1,
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);

  return n;
}
