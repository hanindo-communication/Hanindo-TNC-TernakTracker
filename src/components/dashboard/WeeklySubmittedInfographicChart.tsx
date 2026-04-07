"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklySubmittedChartRow } from "@/lib/dashboard/weekly-progress-chart-data";

export type { WeeklySubmittedChartRow };

const PALETTE = [
  "#32e6ff",
  "#a855f7",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#818cf8",
  "#2dd4bf",
  "#f472b6",
  "#facc15",
  "#38bdf8",
];

function campaignColor(key: string, keys: string[]): string {
  const i = keys.indexOf(key);
  return PALETTE[(i >= 0 ? i : 0) % PALETTE.length];
}

export function WeeklySubmittedInfographicChart({
  data,
  campaignKeys,
  height = 220,
  reducedMotion = false,
  ariaLabel,
}: {
  data: WeeklySubmittedChartRow[];
  campaignKeys: string[];
  height?: number;
  reducedMotion?: boolean;
  ariaLabel: string;
}) {
  const hasData = data.length > 0 && campaignKeys.length > 0;

  if (!hasData) {
    return (
      <div
        className="flex h-[200px] items-center justify-center rounded-xl border border-white/[0.08] bg-black/25 px-4 text-center text-sm text-muted"
        role="img"
        aria-label={ariaLabel}
      >
        Belum ada angka submitted video (numerik) per campaign untuk ditampilkan.
      </div>
    );
  }

  const chartHeight = Math.max(height, 52 + data.length * 52);

  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-black/25 px-1 pb-2 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
          barCategoryGap="18%"
        >
          <CartesianGrid
            strokeDasharray="4 8"
            stroke="rgba(255,255,255,0.05)"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "rgba(148,163,184,0.8)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            type="category"
            dataKey="weekLabel"
            width={148}
            tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(50,230,255,0.06)" }}
            contentStyle={{
              background: "rgba(7, 12, 24, 0.96)",
              border: "1px solid rgba(50,230,255,0.22)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(226,232,240,0.92)", fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              `${value}`,
              name.length > 28 ? `${name.slice(0, 26)}…` : name,
            ]}
          />
          <Legend
            wrapperStyle={{ paddingTop: 12 }}
            formatter={(value) =>
              value.length > 22 ? `${value.slice(0, 20)}…` : value
            }
          />
          {campaignKeys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              stackId="submitted"
              fill={campaignColor(key, campaignKeys)}
              isAnimationActive={!reducedMotion}
              radius={
                idx === campaignKeys.length - 1 ? [0, 8, 8, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
