import { FlaskConical } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { getProviderMeta } from "@/lib/constants";
import { cn, formatEnum } from "@/lib/utils";

/**
 * Shown wherever an action result reports `providerMode: "SIMULATED"` (non-AWS
 * providers, or AWS with real actions disabled) so users never mistake a
 * simulated run for a real mutation.
 */
export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <FlaskConical className="h-3 w-3" />
      Simulated
    </Badge>
  );
}

export function ProviderBadge({
  provider,
  className,
}: {
  provider?: string;
  className?: string;
}) {
  const meta = getProviderMeta(provider);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        meta.badgeClass,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} />
      {meta.short}
    </span>
  );
}

type Variant = NonNullable<BadgeProps["variant"]>;

function pick(
  value: string | undefined,
  map: Record<string, Variant>,
  fallback: Variant = "muted",
): Variant {
  if (!value) return fallback;
  return map[value.toUpperCase()] ?? fallback;
}

const STATUS_VARIANTS: Record<string, Variant> = {
  RUNNING: "success",
  AVAILABLE: "success",
  IN_USE: "success",
  ACTIVE: "success",
  CONNECTED: "success",
  SUCCESS: "success",
  HEALTHY: "success",
  SENT: "success",
  PENDING: "warning",
  QUEUED: "warning",
  SYNCING: "warning",
  RUNNING_SYNC: "warning",
  PARTIAL: "warning",
  STOPPED: "muted",
  DISABLED: "muted",
  TERMINATED: "destructive",
  ERROR: "destructive",
  FAILED: "destructive",
  DELETING: "destructive",
};

const STATUS_DOTS: Record<string, string> = {
  success: "bg-foreground",
  warning: "bg-muted-foreground",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
  default: "bg-primary",
  secondary: "bg-muted-foreground",
  outline: "bg-muted-foreground",
};

export function StatusBadge({
  status,
  className,
  withDot = true,
}: {
  status?: string;
  className?: string;
  withDot?: boolean;
}) {
  const variant = pick(status, STATUS_VARIANTS);
  return (
    <Badge variant={variant} className={cn("font-medium", className)}>
      {withDot ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOTS[variant])}
        />
      ) : null}
      {formatEnum(status) || "Unknown"}
    </Badge>
  );
}

// Waste states are monochrome; "more wasteful" reads as a heavier gray fill
// (none of these are error states, so none use red).
const WASTE_CLASS: Record<string, string> = {
  IDLE: "border-transparent bg-foreground/[0.06] text-foreground",
  UNDERUTILIZED: "border-transparent bg-foreground/[0.06] text-foreground",
  OVERSIZED: "border-transparent bg-foreground/[0.06] text-foreground",
  ORPHANED: "border-transparent bg-foreground/[0.14] text-foreground",
  UNATTACHED: "border-transparent bg-foreground/[0.14] text-foreground",
  DELETABLE: "border-transparent bg-foreground/[0.14] text-foreground",
  STALE: "border-transparent bg-foreground/[0.14] text-foreground",
};

export function WasteBadge({
  wasteState,
  className,
}: {
  wasteState?: string;
  className?: string;
}) {
  if (!wasteState || wasteState.toUpperCase() === "NONE") {
    return (
      <Badge variant="muted" className={className}>
        Healthy
      </Badge>
    );
  }
  return (
    <Badge
      variant="muted"
      className={cn(WASTE_CLASS[wasteState.toUpperCase()], className)}
    >
      {formatEnum(wasteState)}
    </Badge>
  );
}

// Severity escalates by grayscale fill weight; only CRITICAL keeps red.
const SEVERITY_CLASS: Record<string, string> = {
  INFO: "border-transparent bg-muted text-muted-foreground",
  LOW: "border-transparent bg-foreground/[0.06] text-foreground",
  MEDIUM: "border-transparent bg-foreground/[0.12] text-foreground",
  HIGH: "border-transparent bg-foreground text-background",
  CRITICAL: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity?: string;
  className?: string;
}) {
  if (!severity) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge
      variant="muted"
      className={cn(
        SEVERITY_CLASS[severity.toUpperCase()] ??
          "border-transparent bg-muted text-muted-foreground",
        className,
      )}
    >
      {formatEnum(severity)}
    </Badge>
  );
}
