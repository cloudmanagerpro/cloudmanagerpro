import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  delta?: {
    value: number;
    /** When true, a positive delta is rendered as good (green). Default true. */
    positiveIsGood?: boolean;
    label?: string;
  };
  accent?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  accent,
  isLoading,
  className,
}: StatCardProps) {
  const deltaPositive = delta ? delta.value >= 0 : false;
  const positiveIsGood = delta?.positiveIsGood ?? true;
  const deltaIsGood = deltaPositive === positiveIsGood;

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5 transition-colors hover:border-border",
        accent && "border-border bg-muted/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground",
            accent && "border-border bg-foreground/[0.06] text-foreground",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && !isLoading ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              deltaIsGood ? "text-foreground" : "text-destructive",
            )}
          >
            {deltaPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(delta.value).toFixed(1)}%
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        {delta?.label ? (
          <span className="text-muted-foreground">{delta.label}</span>
        ) : null}
      </div>
    </Card>
  );
}
