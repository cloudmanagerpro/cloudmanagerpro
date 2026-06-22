"use client";

import * as React from "react";
import { ChevronDown, LayoutGrid, List } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { ServiceTypeMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

// =============================================================================
// Shared, reusable building blocks for the "grouped by service type" UX used on
// Resources, Optimize (cleanup / idle / rightsizing / overview) and Tag
// Compliance. Everything is monochrome and theme-token driven so light + dark
// both read correctly. These pieces are deliberately "dumb": callers compute
// their own per-group counts/metrics and pass them in, keeping grouping logic
// (see lib/constants `groupByServiceType`) the single source of truth.
// =============================================================================

export type GroupView = "grouped" | "flat";

/** Stable DOM id for a service group so tiles can scroll to their section. */
export function groupDomId(prefix: string, key: string): string {
  return `${prefix}-group-${key}`;
}

/** Smooth-scroll a service group's section into view (no-op on the server). */
export function scrollToGroup(prefix: string, key: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(groupDomId(prefix, key));
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- View toggle (Grouped | Flat) -------------------------------------------

export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: GroupView;
  onChange: (value: GroupView) => void;
  className?: string;
}) {
  const options: { value: GroupView; label: string; icon: typeof List }[] = [
    { value: "grouped", label: "Grouped", icon: LayoutGrid },
    { value: "flat", label: "All", icon: List },
  ];
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center gap-0.5 rounded-lg border border-border/70 bg-muted/40 p-0.5",
        className,
      )}
      role="tablist"
      aria-label="Toggle grouping"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Category summary tiles --------------------------------------------------

export interface CategoryTileDatum {
  key: string;
  meta: ServiceTypeMeta;
  count: number;
  /** Hero secondary value, e.g. "$1,240" or "82%". */
  metric?: React.ReactNode;
  /** Caption beside the metric, e.g. "/mo" or "compliant". */
  metricCaption?: string;
}

function CategoryTile({
  datum,
  caption,
  active,
  onSelect,
}: {
  datum: CategoryTileDatum;
  caption: string;
  active?: boolean;
  onSelect?: (key: string) => void;
}) {
  const Icon = datum.meta.icon;
  const interactive = Boolean(onSelect);
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onSelect ? () => onSelect(datum.key) : undefined}
      aria-pressed={interactive ? Boolean(active) : undefined}
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all",
        interactive && "hover:-translate-y-0.5 hover:border-border hover:shadow-md",
        active
          ? "border-foreground/30 bg-muted/40 ring-1 ring-foreground/10"
          : "border-border/70",
        !interactive && "cursor-default",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors",
            active
              ? "border-transparent bg-foreground text-background"
              : "border-border/70 bg-background/60 text-muted-foreground group-hover:text-foreground",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="text-2xl font-semibold tabular-nums leading-none">
          {datum.count}
        </span>
      </div>
      <p className="mt-3 truncate text-sm font-medium" title={datum.meta.label}>
        {datum.meta.label}
      </p>
      <p className="mt-0.5 flex items-baseline gap-1 text-xs text-muted-foreground">
        {datum.metric !== undefined ? (
          <>
            <span className="font-medium text-foreground tabular-nums">
              {datum.metric}
            </span>
            {datum.metricCaption ? <span>{datum.metricCaption}</span> : null}
          </>
        ) : (
          <span>{caption}</span>
        )}
      </p>
    </button>
  );
}

export function CategoryTiles({
  data,
  caption = "resources",
  activeKey,
  onSelect,
  isLoading,
  skeletonCount = 6,
  className,
}: {
  data: CategoryTileDatum[];
  caption?: string;
  activeKey?: string | null;
  onSelect?: (key: string) => void;
  isLoading?: boolean;
  skeletonCount?: number;
  className?: string;
}) {
  const gridClass =
    "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

  if (isLoading) {
    return (
      <div className={cn(gridClass, className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-7 w-8" />
            </div>
            <Skeleton className="mt-3 h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) return null;

  return (
    <div className={cn(gridClass, className)}>
      {data.map((datum) => (
        <CategoryTile
          key={datum.key}
          datum={datum}
          caption={caption}
          active={activeKey === datum.key}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// --- Category section (collapsible box: header + body) -----------------------

export function CategorySection({
  meta,
  count,
  caption = "resources",
  metric,
  idPrefix,
  active,
  defaultOpen = true,
  children,
  className,
}: {
  meta: ServiceTypeMeta;
  count: number;
  caption?: string;
  metric?: React.ReactNode;
  /** Prefix for the section's DOM id (so tiles can scroll to it). */
  idPrefix?: string;
  active?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const Icon = meta.icon;
  const bodyId = `${idPrefix ?? "section"}-${meta.key}-body`;

  return (
    <section
      id={idPrefix ? groupDomId(idPrefix, meta.key) : undefined}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
        active ? "border-foreground/30 ring-1 ring-foreground/10" : "border-border/70",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
          open && "border-b border-border/70",
        )}
      >
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
            active
              ? "border-transparent bg-foreground text-background"
              : "border-border/70 bg-background/60 text-muted-foreground",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{meta.label}</p>
          <p className="text-xs text-muted-foreground">
            {count} {caption}
          </p>
        </div>
        {metric !== undefined ? (
          <div className="shrink-0 text-right text-sm font-medium tabular-nums">
            {metric}
          </div>
        ) : null}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div id={bodyId}>{children}</div> : null}
    </section>
  );
}

/** Skeleton matching a CategorySection while data loads. */
export function CategorySectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
