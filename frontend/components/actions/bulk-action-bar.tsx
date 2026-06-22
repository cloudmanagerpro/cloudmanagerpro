"use client";

import * as React from "react";
import { Play, Power, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { ActionConfirmDialog } from "./action-confirm-dialog";
import { actionError, notifyActionResult } from "./action-result";
import { getActionMeta } from "./action-meta";
import { TagEditorDialog } from "./tag-editor-dialog";
import { Button } from "@/components/ui/button";
import {
  useBulkActionDryRun,
  useBulkActionExecute,
} from "@/lib/hooks/actions";
import type {
  ActionExecutionResult,
  ActionKind,
  CloudResource,
} from "@/lib/types";

const BULK_ACTIONS: { action: ActionKind; icon: typeof Power }[] = [
  { action: "STOP", icon: Power },
  { action: "START", icon: Play },
  { action: "ADD_TAGS", icon: Tags },
  { action: "TERMINATE", icon: Trash2 },
];

export function BulkActionBar({
  selected,
  onClear,
  onDone,
}: {
  selected: CloudResource[];
  onClear: () => void;
  onDone?: () => void;
}) {
  const count = selected.length;
  const resourceIds = React.useMemo(() => selected.map((r) => r.id), [selected]);
  const hasNonAws = selected.some(
    (r) => (r.provider ?? "").toUpperCase() !== "AWS",
  );

  const dryRun = useBulkActionDryRun();
  const execute = useBulkActionExecute();

  const [pending, setPending] = React.useState<ActionKind | null>(null);
  const [tagOpen, setTagOpen] = React.useState(false);
  const [dryRunResult, setDryRunResult] =
    React.useState<ActionExecutionResult | null>(null);

  if (count === 0) return null;

  const runDryRun = (action: ActionKind) => {
    setDryRunResult(null);
    dryRun.mutate(
      { resourceIds, action },
      {
        onSuccess: (result) => setDryRunResult(result),
        onError: (err) => toast.error(actionError(err, "Dry-run failed")),
      },
    );
  };

  const openAction = (action: ActionKind) => {
    if (action === "ADD_TAGS") {
      setTagOpen(true);
      return;
    }
    setPending(action);
    runDryRun(action);
  };

  const finish = () => {
    onClear();
    onDone?.();
  };

  const handleConfirm = (confirmation?: string) => {
    if (!pending) return;
    const meta = getActionMeta(pending);
    execute.mutate(
      { resourceIds, action: pending, confirmation },
      {
        onSuccess: (result) => {
          notifyActionResult(result, `${meta.verb} requested for ${count} resources`);
          setPending(null);
          setDryRunResult(null);
          finish();
        },
        onError: (err) =>
          toast.error(actionError(err, `Couldn't ${meta.verb.toLowerCase()} resources`)),
      },
    );
  };

  const handleSaveTags = (tags: Record<string, string>) => {
    execute.mutate(
      { resourceIds, action: "ADD_TAGS", params: { tags } },
      {
        onSuccess: (result) => {
          notifyActionResult(result, `Tagged ${count} resources`);
          setTagOpen(false);
          finish();
        },
        onError: (err) => toast.error(actionError(err, "Couldn't tag resources")),
      },
    );
  };

  const pendingMeta = pending ? getActionMeta(pending) : null;
  const destructive = pendingMeta?.destructive ?? false;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/70 bg-popover/95 px-3 py-2 shadow-xl backdrop-blur">
          <span className="px-1.5 text-sm font-medium">
            {count} selected
          </span>
          <span className="h-5 w-px bg-border" />
          {BULK_ACTIONS.map(({ action, icon: Icon }) => {
            const meta = getActionMeta(action);
            return (
              <Button
                key={action}
                variant="ghost"
                size="sm"
                onClick={() => openAction(action)}
                className={
                  meta.destructive
                    ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                    : undefined
                }
              >
                <Icon className="h-4 w-4" />
                {meta.label}
              </Button>
            );
          })}
          <span className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {pending && pendingMeta ? (
        <ActionConfirmDialog
          open={Boolean(pending)}
          onOpenChange={(open) => {
            if (!open) {
              setPending(null);
              setDryRunResult(null);
            }
          }}
          title={`${pendingMeta.verb} ${count} resources?`}
          description={
            <>
              This will {pendingMeta.verb.toLowerCase()} {count} selected
              resources.
            </>
          }
          confirmLabel={`${pendingMeta.verb} ${count}`}
          destructive={destructive}
          confirmPhrase={destructive ? "DELETE" : undefined}
          simulated={hasNonAws}
          onDryRun={() => pending && runDryRun(pending)}
          isDryRunning={dryRun.isPending}
          dryRunResult={dryRunResult}
          onConfirm={handleConfirm}
          isExecuting={execute.isPending}
        />
      ) : null}

      <TagEditorDialog
        open={tagOpen}
        onOpenChange={setTagOpen}
        title={`Tag ${count} resources`}
        description="Tags are applied to every selected resource."
        simulated={hasNonAws}
        isSubmitting={execute.isPending}
        onSubmit={handleSaveTags}
      />
    </>
  );
}
