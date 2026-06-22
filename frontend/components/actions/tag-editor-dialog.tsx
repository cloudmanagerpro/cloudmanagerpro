"use client";

import * as React from "react";
import { Loader2, Plus, Tags, X } from "lucide-react";

import { SimulatedBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface TagRow {
  key: string;
  value: string;
}

export interface TagEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  initialTags?: Record<string, string>;
  simulated?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (tags: Record<string, string>) => void;
}

function toRows(tags?: Record<string, string>): TagRow[] {
  const entries = Object.entries(tags ?? {});
  if (entries.length === 0) return [{ key: "", value: "" }];
  return entries.map(([key, value]) => ({ key, value }));
}

export function TagEditorDialog({
  open,
  onOpenChange,
  title = "Edit tags",
  description,
  initialTags,
  simulated = false,
  isSubmitting = false,
  submitLabel = "Save tags",
  onSubmit,
}: TagEditorDialogProps) {
  const [rows, setRows] = React.useState<TagRow[]>(() => toRows(initialTags));

  React.useEffect(() => {
    if (open) setRows(toRows(initialTags));
  }, [open, initialTags]);

  const update = (index: number, patch: Partial<TagRow>) =>
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const removeRow = (index: number) =>
    setRows((prev) =>
      prev.length === 1 ? [{ key: "", value: "" }] : prev.filter((_, i) => i !== index),
    );

  const addRow = () => setRows((prev) => [...prev, { key: "", value: "" }]);

  const tags = React.useMemo(() => {
    const out: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (key) out[key] = row.value.trim();
    }
    return out;
  }, [rows]);

  const canSubmit = Object.keys(tags).length > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-3">
          {simulated && (
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <SimulatedBadge />
              <span>Simulated — no real cloud changes are made.</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Key</span>
              <span>Value</span>
              <span className="w-8" />
            </div>
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  value={row.key}
                  onChange={(e) => update(index, { key: e.target.value })}
                  placeholder="environment"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Input
                  value={row.value}
                  onChange={(e) => update(index, { value: e.target.value })}
                  placeholder="production"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(index)}
                  aria-label="Remove tag"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addRow} type="button">
            <Plus className="h-4 w-4" />
            Add tag
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={() => onSubmit(tags)} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
