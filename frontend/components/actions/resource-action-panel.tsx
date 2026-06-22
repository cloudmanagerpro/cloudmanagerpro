"use client";

import * as React from "react";
import { toast } from "sonner";

import { ActionConfirmDialog } from "./action-confirm-dialog";
import {
  actionLabel,
  deriveResourceActions,
  getActionMeta,
  isDestructive,
  NON_AWS_TOOLTIP,
} from "./action-meta";
import { actionError, notifyActionResult } from "./action-result";
import { TagEditorDialog } from "./tag-editor-dialog";
import { SimulatedBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useResourceActionDryRun,
  useResourceActionExecute,
  useResourceActions,
} from "@/lib/hooks/actions";
import type {
  ActionExecutionResult,
  CloudResource,
  ResourceAction,
} from "@/lib/types";
import { cn, truncate } from "@/lib/utils";

export function ResourceActionPanel({
  resource,
  onActionComplete,
}: {
  resource: CloudResource;
  onActionComplete?: () => void;
}) {
  const isAws = (resource.provider ?? "").toUpperCase() === "AWS";

  const { data: fetched } = useResourceActions(resource.id);
  const actions = React.useMemo<ResourceAction[]>(
    () => (fetched && fetched.length ? fetched : deriveResourceActions(resource)),
    [fetched, resource],
  );

  const dryRun = useResourceActionDryRun();
  const execute = useResourceActionExecute();

  const [active, setActive] = React.useState<ResourceAction | null>(null);
  const [tagOpen, setTagOpen] = React.useState(false);
  const [dryRunResult, setDryRunResult] =
    React.useState<ActionExecutionResult | null>(null);

  const runDryRun = (action: ResourceAction) => {
    setDryRunResult(null);
    dryRun.mutate(
      { id: resource.id, action: action.action, params: action.params },
      {
        onSuccess: (result) => setDryRunResult(result),
        onError: (err) => toast.error(actionError(err, "Dry-run failed")),
      },
    );
  };

  const handleClick = (action: ResourceAction) => {
    if (action.action === "ADD_TAGS") {
      setTagOpen(true);
      return;
    }
    setActive(action);
    runDryRun(action);
  };

  const handleConfirm = (confirmation?: string) => {
    if (!active) return;
    execute.mutate(
      {
        id: resource.id,
        action: active.action,
        params: active.params,
        confirmation,
      },
      {
        onSuccess: (result) => {
          notifyActionResult(result, `${actionLabel(active)} requested`);
          setActive(null);
          setDryRunResult(null);
          onActionComplete?.();
        },
        onError: (err) =>
          toast.error(actionError(err, `Couldn't ${actionLabel(active).toLowerCase()}`)),
      },
    );
  };

  const handleSaveTags = (tags: Record<string, string>) => {
    execute.mutate(
      { id: resource.id, action: "ADD_TAGS", params: { tags } },
      {
        onSuccess: (result) => {
          notifyActionResult(result, "Tags updated");
          setTagOpen(false);
          onActionComplete?.();
        },
        onError: (err) => toast.error(actionError(err, "Couldn't update tags")),
      },
    );
  };

  const destructive = active ? isDestructive(active) : false;
  const meta = active ? getActionMeta(active.action) : null;
  const confirmPhrase = destructive
    ? resource.name?.trim() || "DELETE"
    : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Actions
        </h4>
        {!isAws ? <SimulatedBadge /> : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-card/40 p-3">
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <ActionButton
              key={action.action}
              action={action}
              disabled={!isAws}
              onClick={() => handleClick(action)}
            />
          ))}
        </div>
        {!isAws ? (
          <p className="mt-3 text-xs text-muted-foreground">{NON_AWS_TOOLTIP}</p>
        ) : null}
      </div>

      {active && meta ? (
        <ActionConfirmDialog
          open={Boolean(active)}
          onOpenChange={(open) => {
            if (!open) {
              setActive(null);
              setDryRunResult(null);
            }
          }}
          title={`${meta.verb} ${truncate(resource.name || "resource", 28)}`}
          description={
            <>
              This will {meta.verb.toLowerCase()}{" "}
              <span className="font-medium text-foreground">
                {resource.name || "this resource"}
              </span>
              {destructive ? ". This cannot be undone." : "."}
            </>
          }
          confirmLabel={meta.verb}
          destructive={destructive}
          confirmPhrase={confirmPhrase}
          onDryRun={() => runDryRun(active)}
          isDryRunning={dryRun.isPending}
          dryRunResult={dryRunResult}
          onConfirm={handleConfirm}
          isExecuting={execute.isPending}
        />
      ) : null}

      <TagEditorDialog
        open={tagOpen}
        onOpenChange={setTagOpen}
        title="Edit tags"
        description={`Update tags on ${resource.name || "this resource"}.`}
        initialTags={resource.tags}
        isSubmitting={execute.isPending}
        onSubmit={handleSaveTags}
      />
    </div>
  );
}

function ActionButton({
  action,
  disabled,
  onClick,
}: {
  action: ResourceAction;
  disabled?: boolean;
  onClick: () => void;
}) {
  const meta = getActionMeta(action.action);
  const Icon = meta.icon;
  const destructive = isDestructive(action);

  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        destructive &&
          "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      <Icon className="h-4 w-4" />
      {actionLabel(action)}
    </Button>
  );

  if (!disabled) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{NON_AWS_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}
