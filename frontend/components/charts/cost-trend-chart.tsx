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

import type { CostTrendPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";

function formatDateTick(value: string | number) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function CostTrendChart({
  data,
  height = 280,
}: {
  data: CostTrendPoint[];
  height?: number;
}) {
  const hasForecast = data.some((d) => d.forecast != null);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--chart-1))"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--chart-1))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(Number(v), { compact: true })}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            content={<ChartTooltip labelFormatter={formatDateTick} />}
            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="cost"
            name="Spend"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#costFill)"
            activeDot={{ r: 4 }}
          />
          {hasForecast ? (
            <Area
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
