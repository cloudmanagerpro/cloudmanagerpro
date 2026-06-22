"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "@/lib/constants";
import { formatCurrency, formatNumber, truncate } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";

export interface CategoryDatum {
  label: string;
  value: number;
  color?: string;
}

export function CategoryBarChart({
  data,
  height = 280,
  currency = true,
  name = "Cost",
}: {
  data: CategoryDatum[];
  height?: number;
  currency?: boolean;
  name?: string;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
          <XAxis
            type="number"
            tickFormatter={(v) =>
              currency
                ? formatCurrency(Number(v), { compact: true })
                : formatNumber(Number(v), true)
            }
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tickFormatter={(v) => truncate(String(v), 18)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.35 }}
          />
          <Bar dataKey="value" name={name} radius={[0, 5, 5, 0]} barSize={18}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color ?? CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
