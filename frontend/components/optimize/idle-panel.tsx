"use client";

import * as React from "react";
import {
  Gauge,
  Loader2,
  MoonStar,
  PiggyBank,
  Power,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { actionError, notifyActionResult } from "@/components/actions/action-result";
import { RecommendationMenu } from "@/components/optimize/recommendation-menu";
import { ProviderBadge, SeverityBadge } from "@/components/shared/badges";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { groupByServiceType } from "@/lib/constants";
import { useApplyIdle } from "@/lib/hooks/actions";
import { useAnalyzeIdle, useIdleResources } from "@/lib/hooks";
import type { IdleResource } from "@/lib/types";
import { formatCurrency, formatEnum, sum } from "@/lib/utils";

const IDLE_GROUP_PREFIX = "idle";

export function IdlePanel() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<GroupView>("grouped");
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useIdleResources();
  const resources = React.useMemo(() => data ?? [], [data]);

  const analyze = useAnalyzeIdle();
  const apply = useApplyIdle();

  const groups = React.useMemo(
    () => groupByServiceType(resources, (r) => r.resourceType),
    [resources],
  );
  const tiles = React.useMemo<CategoryTileDatum[]>(
    () =>
      groups.map((g) => ({
        key: g.key,
        meta: g.meta,
        count: g.items.length,
        metric: formatCurrency(
          sum(g.items.map((r) => r.estimatedMonthlySavings)),
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
      if (next) setTimeout(() => scrollToGroup(IDLE_GROUP_PREFIX, next), 0);
      return next;
    });

  const potentialSavings = sum(resources.map((r) => r.estimatedMonthlySavings));
  const utilValues = resources
    .map((r) => r.avgUtilization)
    .filter((v): v is number => typeof v === "number");
  const avgUtilization = utilValues.length
    ? sum(utilValues) / utilValues.length
    : 0;

  const selected = resources.find((r) => r.id === selectedId) ?? null;

  const handleAnalyze = () => {
    analyze.mutate(undefined, {
      onSuccess: () => toast.success("Analysis complete"),
      onError: (err) => toast.error(actionError(err, "Couldn't analyze resources")),
    });
  };

  const handleApply = (id: string, onDone?: () => void) => {
    apply.mutate(
      { id },
      {
        onSuccess: (result) => {
          notifyActionResult(result, "Stop requested");
          onDone?.();
        },
        onError: (err) => toast.error(actionError(err, "Couldn't stop resource")),
      },
    );
  };

  const columns: DataTableColumn<IdleResource>[] = [
    {
      key: "resource",
      header: "Resource",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.resourceName || "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatEnum(r.resourceType)}
          </p>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (r) => <ProviderBadge provider={r.provider} />,
    },
    {
      key: "utilization",
      header: "Utilization",
      cell: (r) => {
        const avg = r.avgUtilization ?? 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(avg, 100)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {avg.toFixed(0)}%
            </span>
          </div>
        );
      },
    },
    {
      key: "observation",
      header: "Observation",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.observationDays ? `${r.observationDays}d` : "—"}
        </span>
      ),
    },
    {
      key: "savings",
      header: "Est. savings",
      align: "right",
      cell: (r) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(r.estimatedMonthlySavings)}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (r) => <SeverityBadge severity={r.severity} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <RecommendationMenu
          type="idle"
          id={r.id}
          onApply={() => handleApply(r.id)}
          applyLabel="Apply (stop)"
          applyIcon={Power}
          busy={apply.isPending && apply.variables?.id === r.id}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Stop or downsize low-utilization resources that are barely used.
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
          label="Idle resources"
          value={resources.length}
          icon={MoonStar}
          isLoading={isLoading}
          hint="low utilization"
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
          label="Avg utilization"
          value={`${avgUtilization.toFixed(0)}%`}
          icon={Gauge}
          isLoading={isLoading}
          hint="across idle resources"
        />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : view === "flat" ? (
        <DataTable
          columns={columns}
          data={resources}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyIcon={MoonStar}
          emptyTitle="No idle resources"
          emptyDescription="Run an analysis to detect resources sitting at low utilization across your accounts."
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <CategoryTiles data={[]} isLoading skeletonCount={4} />
          {Array.from({ length: 3 }).map((_, i) => (
            <CategorySectionSkeleton key={i} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={MoonStar}
          title="No idle resources"
          description="Run an analysis to detect resources sitting at low utilization across your accounts."
        />
      ) : (
        <div className="space-y-4">
          <CategoryTiles
            data={tiles}
            caption="idle"
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
              caption={g.items.length === 1 ? "resource" : "resources"}
              active={activeGroup === g.key}
              idPrefix={IDLE_GROUP_PREFIX}
              metric={
                <>
                  {formatCurrency(
                    sum(g.items.map((r) => r.estimatedMonthlySavings)),
                  )}{" "}
                  <span className="font-normal text-muted-foreground">/mo</span>
                </>
              }
            >
              <DataTable
                columns={columns}
                data={g.items}
                getRowId={(r) => r.id}
                onRowClick={(r) => setSelectedId(r.id)}
                className="rounded-none border-0 shadow-none"
              />
            </CategorySection>
          ))}
        </div>
      )}

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
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
                </div>

                <DrawerSection title="Utilization">
                  <DrawerField label="Metric">
                    {selected.metric ?? "CPU"}
                  </DrawerField>
                  <DrawerField label="Avg utilization">
                    {`${selected.avgUtilization?.toFixed(1) ?? 0}%`}
                  </DrawerField>
                  <DrawerField label="Max utilization">
                    {`${selected.maxUtilization?.toFixed(1) ?? "—"}%`}
                  </DrawerField>
                  <DrawerField label="Observation days">
                    {selected.observationDays ?? "—"}
                  </DrawerField>
                </DrawerSection>

                <DrawerSection title="Recommendation">
                  {selected.recommendation ? (
                    <p className="border-b border-border/50 px-4 py-3 text-sm">
                      {selected.recommendation}
                    </p>
                  ) : (
                    <p className="border-b border-border/50 px-4 py-3 text-sm text-muted-foreground">
                      No recommendation
                    </p>
                  )}
                  <DrawerField label="Estimated savings">
                    {formatCurrency(selected.estimatedMonthlySavings)}
                  </DrawerField>
                  <DrawerField label="Region">{selected.region ?? "—"}</DrawerField>
                </DrawerSection>
              </div>

              <SheetFooter>
                <Button
                  onClick={() =>
                    handleApply(selected.id, () => setSelectedId(null))
                  }
                  disabled={apply.isPending}
                >
                  {apply.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Apply (stop)
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
