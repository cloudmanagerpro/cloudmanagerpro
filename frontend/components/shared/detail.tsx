import * as React from "react";

import { cn } from "@/lib/utils";

export function DrawerSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {title ? (
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      ) : null}
      <div className="rounded-xl border border-border/70 bg-card/40">
        {children}
      </div>
    </div>
  );
}

export function DrawerField({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 px-4 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "max-w-[60%] text-right text-sm font-medium",
          mono && "break-all font-mono text-xs",
        )}
      >
        {children ?? "—"}
      </span>
    </div>
  );
}

export function TagPills({ tags }: { tags?: Record<string, string> }) {
  const entries = Object.entries(tags ?? {});
  if (entries.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">No tags</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 p-4">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/50 px-2 py-1 text-xs"
        >
          <span className="text-muted-foreground">{key}</span>
          <span className="font-medium">{value}</span>
        </span>
      ))}
    </div>
  );
}
