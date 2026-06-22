"use client";

import { formatCurrency } from "@/lib/utils";

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  currency?: boolean;
  labelFormatter?: (label: string | number) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  currency = true,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined ? (
        <p className="mb-1.5 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto font-medium text-foreground">
              {currency && typeof item.value === "number"
                ? formatCurrency(item.value)
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
