"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, labelMonth } from "@/lib/utils";

export interface MiniRevenuePoint {
  monthKey: string;
  value: number;
}

export function MiniRevenueAreaChart({
  points,
  ariaLabel,
  height = 140,
  reducedMotion = false,
}: {
  points: MiniRevenuePoint[];
  ariaLabel: string;
  height?: number;
  reducedMotion?: boolean;
}) {
  if (points.length < 1) return null;
  const data = points.map((p) => ({
    label: labelMonth(p.monthKey),
    value: p.value,
  }));

  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-black/25 px-1 pb-1 pt-2"
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="miniRevFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#32e6ff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(148,163,184,0.85)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            width={44}
            tick={{ fill: "rgba(148,163,184,0.75)", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              v >= 1e9
                ? `${(v / 1e9).toFixed(1)}B`
                : v >= 1e6
                  ? `${(v / 1e6).toFixed(1)}M`
                  : v >= 1e3
                    ? `${(v / 1e3).toFixed(0)}K`
                    : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              background: "rgba(7, 12, 24, 0.95)",
              border: "1px solid rgba(50,230,255,0.2)",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(226,232,240,0.9)" }}
            formatter={(value) => [
              formatCurrency(typeof value === "number" ? value : Number(value) || 0),
              "Nilai",
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#32e6ff"
            strokeWidth={2}
            fill="url(#miniRevFill)"
            dot={{ r: 3, fill: "#32e6ff", stroke: "#070c18", strokeWidth: 1 }}
            activeDot={{ r: 4 }}
            isAnimationActive={!reducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
