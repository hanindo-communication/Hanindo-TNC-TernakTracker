"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TableSegmentOption {
  id: string;
  label: string;
}

interface QuickFilterChipsProps {
  segments: TableSegmentOption[];
  value: string;
  onChange: (v: string) => void;
}

export function QuickFilterChips({
  segments,
  value,
  onChange,
}: QuickFilterChipsProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const track = trackRef.current;
    const activeIndex = segments.findIndex((s) => s.id === value);
    const btn = btnRefs.current[activeIndex];
    if (!track || !btn) {
      setPill({ left: 0, width: 0, height: 0 });
      return;
    }
    const tr = track.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setPill({
      left: br.left - tr.left,
      width: br.width,
      height: br.height,
    });
  }, [value, segments]);

  return (
    <div
      ref={trackRef}
      className="quick-filter-pill-track relative flex flex-wrap gap-2"
    >
      <span
        className="quick-filter-pill-slide pointer-events-none absolute top-0 rounded-full border border-neon-cyan/40 bg-neon-cyan/12 shadow-[0_0_20px_rgba(50,230,255,0.18)] transition-[left,width,height,transform] duration-300 ease-out motion-reduce:transition-none"
        style={{
          left: pill.width ? pill.left : 0,
          width: pill.width || 0,
          height: pill.height || undefined,
          opacity: pill.width ? 1 : 0,
        }}
        aria-hidden
      />
      {segments.map((item, i) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "relative z-10 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/45 focus-visible:ring-offset-2 focus-visible:ring-offset-night",
              active
                ? "border-transparent text-neon-cyan"
                : "border-white/10 bg-white/[0.03] text-muted hover:border-neon-purple/40 hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
