"use client";

export function DashboardSkeleton() {
  return (
    <div className="relative mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-6 border-b border-white/[0.07] pb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="h-6 w-32 rounded-full skeleton-shimmer" />
          <div className="h-9 w-72 max-w-full rounded-lg skeleton-shimmer" />
          <div className="h-4 w-full max-w-xl rounded skeleton-shimmer" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-40 rounded-xl skeleton-shimmer" />
          <div className="h-10 w-44 rounded-xl skeleton-shimmer" />
          <div className="h-11 w-28 rounded-xl skeleton-shimmer" />
          <div className="h-11 w-36 rounded-xl skeleton-shimmer" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-28 rounded-full skeleton-shimmer"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="h-12 border-b border-white/[0.06] skeleton-shimmer" />
        <div className="divide-y divide-white/[0.04] px-2 py-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-4 py-4">
              <div className="h-10 w-10 shrink-0 rounded-full skeleton-shimmer" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 rounded skeleton-shimmer" />
                <div className="h-3 w-24 rounded skeleton-shimmer" />
              </div>
              <div className="hidden w-20 rounded sm:block skeleton-shimmer" />
              <div className="hidden w-24 rounded md:block skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
