"use client";

import * as React from "react";
import {
  AlertTriangle,
  Ban,
  Loader2,
  PiggyBank,
  Play,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { actionError } from "@/components/actions/action-result";
import { RecommendationMenu } from "@/components/optimize/recommendation-menu";
import {
  ProviderBadge,
  SeverityBadge,
  WasteBadge,
} from "@/components/shared/badges";
import {
  CategorySection,
  CategorySectionSkeleton,
  CategoryTiles,
  ViewToggle,
  scrollToGroup,
  type CategoryTileDatum,
  type GroupView,
} from "@/components/shared/category-group";
import { DrawerField, DrawerSection } from "@/components/shared/detail";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { groupByServiceType } from "@/lib/constants";
import {
  useAnalyzeCleanup,
  useCleanupCandidates,
  useCleanupDryRun,
  useExecuteCleanup,
  useIgnoreCleanup,
} from "@/lib/hooks";
import type { CleanupCandidate, DryRunResult } from "@/lib/types";
import { cn, formatCurrency, formatEnum, formatPercent, sum } from "@/lib/utils";

const CLEANUP_GROUP_PREFIX = "cleanup";

export function CleanupPanel() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [executeTarget, setExecuteTarget] =
    React.useState<CleanupCandidate | null>(null);
  const [dryRunResult, setDryRunResult] = React.useState<DryRunResult | null>(
    null,
  );
  const [view, setView] = React.useState<GroupView>("grouped");
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useCleanupCandidates();
  const candidates = React.useMemo(() => data ?? [], [data]);

  const groups = React.useMemo(
    () => groupByServiceType(candidates, (c) => c.resourceType),
    [candidates],
  );
  const tiles = React.useMemo<CategoryTileDatum[]>(
    () =>
      groups.map((g) => ({
        key: g.key,
        meta: g.meta,
        count: g.items.length,
        metric: formatCurrency(
          sum(g.items.map((c) => c.estimatedMonthlySavings)),
          { compact: true },
        ),
        metricCaption: "/mo",
      })),
    [groups],
  );
  React.useEffect(() => {
    if (activeGroup && !groups.some((g) => g.key === activeGroup)) {
      setActiveGroup(null);
    }
  }, [groups, activeGroup]);
  const visibleGroups = activeGroup
    ? groups.filter((g) => g.key === activeGroup)
    : groups;
  const handleTileSelect = (key: string) =>
    setActiveGroup((prev) => {
      const next = prev === key ? null : key;
      if (next) setTimeout(() => scrollToGroup(CLEANUP_GROUP_PREFIX, next), 0);
      return next;
    });

  const analyze = useAnalyzeCleanup();
  const dryRun = useCleanupDryRun();
  const execute = useExecuteCleanup();
  const ignore = useIgnoreCleanup();

  const potentialSavings = sum(candidates.map((c) => c.estimatedMonthlySavings));
  const highSeverity = candidates.filter((c) => {
    const s = c.severity?.toUpperCase();
    return s === "HIGH" || s === "CRITICAL";
  }).length;

  const selected = candidates.find((c) => c.id === selectedId) ?? null;

  const openCandidate = (id: string) => {
    setDryRunResult(null);
    setSelectedId(id);
  };

  const closeSheet = () => {
    setSelectedId(null);
    setDryRunResult(null);
  };

  const handleAnalyze = () => {
    analyze.mutate(undefined, {
      onSuccess: () => toast.success("Analysis complete"),
      onError: (err) =>
        toast.error(actionError(err, "Couldn't analyze resources")),
    });
  };

  const handleDryRun = (id: string) => {
    setDryRunResult(null);
    dryRun.mutate(id, {
      onSuccess: (result) => {
        setDryRunResult(result);
        toast.success("Dry run complete");
      },
      onError: (err) => toast.error(actionError(err, "Dry run failed")),
    });
  };

  const handleExecute = () => {
    if (!executeTarget) return;
    const id = executeTarget.id;
    execute.mutate(id, {
      onSuccess: (result) => {
        if (result?.executed) {
          toast.success(result.message ?? "Cleanup executed");
        } else {
          toast.warning(
            result?.message ??
              "Execution is blocked. Enable real cloud actions on the server to proceed.",
          );
        }
        setExecuteTarget(null);
        if (selectedId === id) closeSheet();
      },
      onError: (err) => toast.error(actionError(err, "Couldn't execute cleanup")),
    });
  };

  const handleIgnore = (id: string) => {
    ignore.mutate(id, {
      onSuccess: () => {
        toast.success("Candidate ignored");
        if (selectedId === id) closeSheet();
      },
      onError: (err) => toast.error(actionError(err, "Couldn't ignore candidate")),
    });
  };

  const columns: DataTableColumn<CleanupCandidate>[] = [
    {
      key: "resource",
      header: "Resource",
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{c.resourceName || "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatEnum(c.resourceType)}
          </p>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (c) => <ProviderBadge provider={c.provider} />,
    },
    {
      key: "reason",
      header: "Reason",
      cell: (c) => (
        <span className="block max-w-xs truncate text-sm text-muted-foreground">
          {c.reason ?? formatEnum(c.recommendedAction)}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (c) => <SeverityBadge severity={c.severity} />,
    },
    {
      key: "savings",
      header: "Est. savings",
      align: "right",
      cell: (c) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(c.estimatedMonthlySavings)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (c) => {
        const rowBusy =
          (dryRun.isPending && dryRun.variables === c.id) ||
          (execute.isPending && execute.variables === c.id) ||
          (ignore.isPending && ignore.variables === c.id);
        return (
          <RecommendationMenu
            type="cleanup"
            id={c.id}
            busy={rowBusy}
            leading={
              <>
                <DropdownMenuItem
                  onSelect={() => {
                    openCandidate(c.id);
                    handleDryRun(c.id);
                  }}
                >
                  <Play className="h-4 w-4" />
                  Dry run
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setExecuteTarget(c)}
                >
                  <Trash2 className="h-4 w-4" />
                  Execute
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleIgnore(c.id)}>
                  <Ban className="h-4 w-4" />
                  Ignore
                </DropdownMenuItem>
              </>
            }
          />
        );
      },
    },
  ];

  const dryRunBusy = selected
    ? dryRun.isPending && dryRun.variables === selected.id
    : false;
  const ignoreBusy = selected
    ? ignore.isPending && ignore.variables === selected.id
    : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Remove orphaned and wasteful resources you no longer use.
        </p>
        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Button
            variant="gradient"
            onClick={handleAnalyze}
            disabled={analyze.isPending}
          >
            {analyze.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyze
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Candidates"
          value={candidates.length}
          icon={Trash2}
          isLoading={isLoading}
          hint="flagged for cleanup"
        />
        <StatCard
          label="Potential savings"
          value={formatCurrency(potentialSavings, { compact: true })}
          icon={PiggyBank}
          isLoading={isLoading}
          accent
          hint="per month"
        />
        <StatCard
          label="High severity"
          value={highSeverity}
          icon={AlertTriangle}
          isLoading={isLoading}
          hint="high or critical"
        />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : view === "flat" ? (
        <DataTable
          columns={columns}
          data={candidates}
          getRowId={(c) => c.id}
          isLoading={isLoading}
          onRowClick={(c) => openCandidate(c.id)}
          emptyIcon={Trash2}
          emptyTitle="No cleanup candidates"
          emptyDescription="Run an analysis to surface orphaned and wasteful resources you can safely remove."
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <CategoryTiles data={[]} isLoading skeletonCount={4} />
          {Array.from({ length: 3 }).map((_, i) => (
            <CategorySectionSkeleton key={i} />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="No cleanup candidates"
          description="Run an analysis to surface orphaned and wasteful resources you can safely remove."
        />
      ) : (
        <div className="space-y-4">
          <CategoryTiles
            data={tiles}
            caption="candidates"
            activeKey={activeGroup}
            onSelect={handleTileSelect}
          />
          {activeGroup ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {groups.find((g) => g.key === activeGroup)?.meta.label}
                </span>{" "}
                only
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveGroup(null)}
              >
                <X className="h-4 w-4" />
                Show all
              </Button>
            </div>
          ) : null}
          {visibleGroups.map((g) => (
            <CategorySection
              key={g.key}
              meta={g.meta}
              count={g.items.length}
              caption={g.items.length === 1 ? "candidate" : "candidates"}
              active={activeGroup === g.key}
              idPrefix={CLEANUP_GROUP_PREFIX}
              metric={
                <>
                  {formatCurrency(
                    sum(g.items.map((c) => c.estimatedMonthlySavings)),
                  )}{" "}
                  <span className="font-normal text-muted-foreground">/mo</span>
                </>
              }
            >
              <DataTable
                columns={columns}
                data={g.items}
                getRowId={(c) => c.id}
                onRowClick={(c) => openCandidate(c.id)}
                className="rounded-none border-0 shadow-none"
              />
            </CategorySection>
          ))}
        </div>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="truncate pr-6">
                  {selected.resourceName}
                </SheetTitle>
                <SheetDescription>
                  {formatEnum(selected.resourceType)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <ProviderBadge provider={selected.provider} />
                  <SeverityBadge severity={selected.severity} />
                  {selected.wasteState ? (
                    <WasteBadge wasteState={selected.wasteState} />
                  ) : null}
                </div>

                <DrawerSection title="Details">
                  <DrawerField label="Reason">{selected.reason ?? "—"}</DrawerField>
                  <DrawerField label="Recommended action">
                    {formatEnum(selected.recommendedAction)}
                  </DrawerField>
                  <DrawerField label="Region">{selected.region ?? "—"}</DrawerField>
                  <DrawerField label="Estimated savings">
                    {formatCurrency(selected.estimatedMonthlySavings)}
                  </DrawerField>
                  {selected.confidence !== undefined ? (
                    <DrawerField label="Confidence">
                      {formatPercent(selected.confidence)}
                    </DrawerField>
                  ) : null}
                </DrawerSection>

                <DrawerSection title="Dry run">
                  <div className="space-y-3 p-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDryRun(selected.id)}
                      disabled={dryRunBusy}
                    >
                      {dryRunBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Simulate cleanup
                    </Button>

                    {dryRunResult ? (
                      <div className="space-y-2">
                        {dryRunResult.summary ? (
                          <p className="text-sm text-muted-foreground">
                            {dryRunResult.summary}
                          </p>
                        ) : null}
                        {typeof dryRunResult.wouldSucceed === "boolean" ? (
                          <p
                            className={cn(
                              "text-sm font-medium",
                              dryRunResult.wouldSucceed
                                ? "text-foreground"
                                : "text-destructive",
                            )}
                          >
                            {dryRunResult.wouldSucceed
                              ? "Would succeed"
                              : "Would fail"}
                          </p>
                        ) : null}
                        {dryRunResult.steps?.length ? (
                          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                            {dryRunResult.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </DrawerSection>
              </div>

              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => handleIgnore(selected.id)}
                  disabled={ignoreBusy}
                >
                  {ignoreBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Ignore
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setExecuteTarget(selected)}
                  disabled={execute.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Execute
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(executeTarget)}
        onOpenChange={(open) => !open && setExecuteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Execute cleanup?</DialogTitle>
            <DialogDescription>
              This will attempt to remove{" "}
              <span className="font-medium text-foreground">
                {executeTarget?.resourceName}
              </span>
              . Destructive actions are simulated unless real actions are enabled
              on the server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExecuteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecute}
              disabled={execute.isPending}
            >
              {execute.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing…
                </>
              ) : (
                "Execute cleanup"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
