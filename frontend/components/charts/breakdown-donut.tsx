"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CHART_COLORS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

export function BreakdownDonut({
  data,
  height = 220,
  centerLabel = "Total",
  currency = true,
  showLegend = true,
  className,
}: {
  data: DonutDatum[];
  height?: number;
  centerLabel?: string;
  currency?: boolean;
  showLegend?: boolean;
  className?: string;
}) {
  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);
  const colored = data.map((d, i) => ({
    ...d,
    color: d.color ?? CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row", className)}>
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={colored}
              dataKey="value"
              nameKey="label"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={colored.length > 1 ? 2 : 0}
              strokeWidth={0}
            >
              {colored.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
          <span className="text-lg font-semibold tracking-tight">
            {currency ? formatCurrency(total, { compact: true }) : total}
          </span>
        </div>
      </div>

      {showLegend ? (
        <div className="flex-1 space-y-2">
          {colored.map((entry) => {
            const pct = total > 0 ? (entry.value / total) * 100 : 0;
            return (
              <div key={entry.label} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate text-muted-foreground">
                  {entry.label}
                </span>
                <span className="ml-auto font-medium">
                  {currency ? formatCurrency(entry.value) : entry.value}
                </span>
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
