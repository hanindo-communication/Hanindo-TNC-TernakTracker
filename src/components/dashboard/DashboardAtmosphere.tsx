"use client";

import type { ReactNode } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function DashboardAtmosphere({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const n = usePointerParallax(!reducedMotion);
  const dx = n.x * 16;
  const dy = n.y * 12;
  const dx2 = n.x * -12;
  const dy2 = n.y * -14;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="app-bg-grid" aria-hidden />
      <div className="app-bg-noise" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 animate-gradient-bg opacity-70"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-40 top-24 z-0 h-72 w-72 glow-orb"
        aria-hidden
      >
        <div
          className="h-full w-full rounded-full bg-neon-purple/25 blur-3xl will-change-transform"
          style={{
            transform: `translate3d(${dx}px, ${dy}px, 0)`,
          }}
        />
      </div>
      <div
        className="pointer-events-none fixed -right-32 bottom-0 z-0 h-80 w-80 glow-orb"
        aria-hidden
        style={{ animationDelay: "1.2s" }}
      >
        <div
          className="h-full w-full rounded-full bg-neon-cyan/20 blur-3xl will-change-transform"
          style={{
            transform: `translate3d(${dx2}px, ${dy2}px, 0)`,
          }}
        />
      </div>

      {children}
    </div>
  );
}
