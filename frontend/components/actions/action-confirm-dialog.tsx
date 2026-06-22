"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Play } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import type { ActionExecutionResult } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export interface ActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** When set, the user must type this exact phrase to enable confirm. */
  confirmPhrase?: string;
  /** Show a "Simulated" hint (e.g. non-AWS resources). */
  simulated?: boolean;
  onDryRun?: () => void;
  isDryRunning?: boolean;
  dryRunResult?: ActionExecutionResult | null;
  onConfirm: (confirmation?: string) => void;
  isExecuting?: boolean;
}

export function ActionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  confirmPhrase,
  simulated = false,
  onDryRun,
  isDryRunning = false,
  dryRunResult,
  onConfirm,
  isExecuting = false,
}: ActionConfirmDialogProps) {
  const [typed, setTyped] = React.useState("");

  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const needsPhrase = destructive && Boolean(confirmPhrase);
  const phraseOk = !needsPhrase || typed.trim() === confirmPhrase;
  const busy = isExecuting || isDryRunning;

  const resultSimulated =
    dryRunResult?.providerMode === "SIMULATED" || dryRunResult?.simulated;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : null}
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-3">
          {(simulated || resultSimulated) && (
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <SimulatedBadge />
              <span>
                This runs in simulation mode — no real cloud changes are made.
              </span>
            </div>
          )}

          {onDryRun ? (
            <div className="rounded-lg border border-border/70 bg-card/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Dry-run preview</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDryRun}
                  disabled={busy}
                >
                  {isDryRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {dryRunResult ? "Re-run" : "Run dry-run"}
                </Button>
              </div>

              {isDryRunning && !dryRunResult ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Simulating…
                </p>
              ) : dryRunResult ? (
                <div className="mt-2 space-y-1.5 text-sm">
                  {typeof dryRunResult.success === "boolean" ? (
                    <p
                      className={cn(
                        "font-medium",
                        dryRunResult.success
                          ? "text-foreground"
                          : "text-destructive",
                      )}
                    >
                      {dryRunResult.success ? "Would succeed" : "Would fail"}
                    </p>
                  ) : null}
                  {dryRunResult.message ? (
                    <p className="text-muted-foreground">
                      {dryRunResult.message}
                    </p>
                  ) : null}
                  {dryRunResult.fromType || dryRunResult.toType ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {dryRunResult.fromType ?? "—"} → {dryRunResult.toType ?? "—"}
                    </p>
                  ) : null}
                  {typeof dryRunResult.estimatedMonthlySavings === "number" ? (
                    <p className="text-muted-foreground">
                      Est. savings{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(dryRunResult.estimatedMonthlySavings)}/mo
                      </span>
                    </p>
                  ) : null}
                  {dryRunResult.steps?.length ? (
                    <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                      {dryRunResult.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Preview the effect before executing.
                </p>
              )}
            </div>
          ) : null}

          {needsPhrase ? (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-phrase" className="text-sm">
                Type{" "}
                <span className="font-mono font-semibold text-foreground">
                  {confirmPhrase}
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="confirm-phrase"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={confirmPhrase}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={typed.length > 0 && !phraseOk}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm(needsPhrase ? typed.trim() : undefined)}
            disabled={!phraseOk || busy}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
