"use client";

import * as React from "react";
import { ArrowRight, Loader2, Play, Scaling } from "lucide-react";

import { notifyActionResult, actionError } from "@/components/actions/action-result";
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
import { toast } from "sonner";
import {
  useApplyRightsizing,
  useResourceActionDryRun,
} from "@/lib/hooks/actions";
import type { ActionExecutionResult, RightsizingRecommendation } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export interface ApplyResizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: RightsizingRecommendation | null;
  onApplied?: () => void;
}

export function ApplyResizeDialog({
  open,
  onOpenChange,
  recommendation,
  onApplied,
}: ApplyResizeDialogProps) {
  const dryRun = useResourceActionDryRun();
  const apply = useApplyRightsizing();
  const [dryRunResult, setDryRunResult] =
    React.useState<ActionExecutionResult | null>(null);

  React.useEffect(() => {
    if (!open) {
      setDryRunResult(null);
      dryRun.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!recommendation) return null;

  const simulated = recommendation.provider !== "AWS";
  const resourceId = recommendation.resourceId;
  const busy = dryRun.isPending || apply.isPending;

  const handleDryRun = () => {
    if (!resourceId) {
      toast.message("Preview unavailable", {
        description: "This recommendation has no linked resource to simulate.",
      });
      return;
    }
    setDryRunResult(null);
    dryRun.mutate(
      {
        id: resourceId,
        action: "RESIZE",
        params: recommendation.recommendedType
          ? { instanceType: recommendation.recommendedType }
          : undefined,
      },
      {
        onSuccess: (result) => {
          setDryRunResult(result);
          toast.success("Dry-run complete");
        },
        onError: (err) => toast.error(actionError(err, "Dry-run failed")),
      },
    );
  };

  const handleApply = () => {
    apply.mutate(
      {
        id: recommendation.id,
        instanceType: recommendation.recommendedType,
      },
      {
        onSuccess: (result) => {
          notifyActionResult(result, "Resize applied");
          onApplied?.();
          onOpenChange(false);
        },
        onError: (err) => toast.error(actionError(err, "Couldn't apply resize")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scaling className="h-4 w-4" />
            Apply rightsizing
          </DialogTitle>
          <DialogDescription className="truncate">
            {recommendation.resourceName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {simulated && (
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <SimulatedBadge />
              <span>
                {recommendation.provider} actions are simulated — connect AWS for
                real changes.
              </span>
            </div>
          )}

          <div className="rounded-lg border border-border/70 bg-card/40 p-4">
            <div className="flex items-center justify-center gap-3 font-mono text-sm">
              <span className="rounded-md bg-muted px-2 py-1">
                {recommendation.currentType ?? "—"}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="rounded-md bg-primary/10 px-2 py-1 font-semibold text-foreground">
                {recommendation.recommendedType ?? "recommended"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Current</p>
                <p className="mt-0.5 font-medium tabular-nums">
                  {formatCurrency(recommendation.currentMonthlyCost)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Projected</p>
                <p className="mt-0.5 font-medium tabular-nums">
                  {formatCurrency(recommendation.projectedMonthlyCost)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Savings</p>
                <p className="mt-0.5 font-medium tabular-nums text-foreground">
                  {formatCurrency(recommendation.estimatedMonthlySavings)}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Resizing stops the instance, changes its type, then starts it again —
            expect brief downtime.
          </p>

          <div className="rounded-lg border border-border/70 bg-card/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Dry-run preview</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDryRun}
                disabled={busy}
              >
                {dryRun.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {dryRunResult ? "Re-run" : "Run dry-run"}
              </Button>
            </div>
            {dryRunResult ? (
              <div className="mt-2 space-y-1 text-sm">
                {typeof dryRunResult.success === "boolean" ? (
                  <p
                    className={cn(
                      "font-medium",
                      dryRunResult.success ? "text-foreground" : "text-destructive",
                    )}
                  >
                    {dryRunResult.success ? "Would succeed" : "Would fail"}
                  </p>
                ) : null}
                {dryRunResult.message ? (
                  <p className="text-muted-foreground">{dryRunResult.message}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Simulate the resize before applying.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={busy}>
            {apply.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying…
              </>
            ) : (
              "Apply resize"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
