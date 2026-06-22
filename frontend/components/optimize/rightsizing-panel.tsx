"use client";

import * as React from "react";
import {
  ArrowRight,
  Loader2,
  PiggyBank,
  Scaling,
  TrendingDown,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { actionError } from "@/components/actions/action-result";
import { ApplyResizeDialog } from "@/components/actions/apply-resize-dialog";
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
import { useAnalyzeRightsizing, useRightsizing } from "@/lib/hooks";
import type { RightsizingRecommendation } from "@/lib/types";
import { formatCurrency, formatEnum, formatNumber, sum } from "@/lib/utils";

const RIGHTSIZING_GROUP_PREFIX = "rightsizing";

export function RightsizingPanel() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [applyTarget, setApplyTarget] =
    React.useState<RightsizingRecommendation | null>(null);
  const [view, setView] = React.useState<GroupView>("grouped");
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useRightsizing();
  const recommendations = React.useMemo(() => data ?? [], [data]);

  const analyze = useAnalyzeRightsizing();

  const groups = React.useMemo(
    () => groupByServiceType(recommendations, (r) => r.resourceType),
    [recommendations],
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
      if (next)
        setTimeout(() => scrollToGroup(RIGHTSIZING_GROUP_PREFIX, next), 0);
      return next;
    });

  const handleAnalyze = () => {
    analyze.mutate(undefined, {
      onSuccess: () =>
        toast.success("Analysis complete", {
          description: "Rightsizing recommendations refreshed.",
        }),
      onError: (err) => toast.error(actionError(err, "Couldn't run the analysis")),
    });
  };

  const totalSavings = sum(recommendations.map((r) => r.estimatedMonthlySavings));
  const withPercent = recommendations.filter(
    (r) => typeof r.savingsPercent === "number",
  );
  const avgSavingsPercent = withPercent.length
    ? sum(withPercent.map((r) => r.savingsPercent)) / withPercent.length
    : 0;

  const selected = recommendations.find((r) => r.id === selectedId) ?? null;

  const columns: DataTableColumn<RightsizingRecommendation>[] = [
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
      key: "change",
      header: "Change",
      cell: (r) =>
        r.currentType || r.recommendedType ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-xs">{r.currentType ?? "—"}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-mono text-xs">{r.recommendedType ?? "—"}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "utilization",
      header: "Utilization",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {`CPU ${r.cpuUtilization?.toFixed(0) ?? "—"}%`}
          {typeof r.memoryUtilization === "number"
            ? ` · Mem ${r.memoryUtilization.toFixed(0)}%`
            : ""}
        </span>
      ),
    },
    {
      key: "savings",
      header: "Est. savings",
      align: "right",
      cell: (r) => (
        <div>
          <p className="font-medium tabular-nums">
            {formatCurrency(r.estimatedMonthlySavings)}
          </p>
          {typeof r.savingsPercent === "number" ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {`${r.savingsPercent.toFixed(0)}%`}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <RecommendationMenu
          type="rightsizing"
          id={r.id}
          onApply={() => setApplyTarget(r)}
          applyLabel="Apply resize"
          applyIcon={Scaling}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Resize over-provisioned compute to match real utilization.
        </p>
        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Button
            variant="gradient"
            onClick={handleAnalyze}
            disabled={analyze.isPending}
          >
            {analyze.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Scaling className="h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Recommendations"
          value={formatNumber(recommendations.length)}
          icon={Scaling}
          isLoading={isLoading}
          hint="to review"
        />
        <StatCard
          label="Potential savings"
          value={formatCurrency(totalSavings, { compact: true })}
          icon={PiggyBank}
          isLoading={isLoading}
          accent
          hint="per month"
        />
        <StatCard
          label="Avg savings"
          value={`${avgSavingsPercent.toFixed(0)}%`}
          icon={TrendingDown}
          isLoading={isLoading}
          hint="per recommendation"
        />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : view === "flat" ? (
        <DataTable
          columns={columns}
          data={recommendations}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyIcon={Scaling}
          emptyTitle="No recommendations"
          emptyDescription="Run an analysis to surface over-provisioned, resizable resources."
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <CategoryTiles data={[]} isLoading skeletonCount={4} />
          {Array.from({ length: 3 }).map((_, i) => (
            <CategorySectionSkeleton key={i} />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <EmptyState
          icon={Scaling}
          title="No recommendations"
          description="Run an analysis to surface over-provisioned, resizable resources."
        />
      ) : (
        <div className="space-y-4">
          <CategoryTiles
            data={tiles}
            caption="recommendations"
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
              caption={
                g.items.length === 1 ? "recommendation" : "recommendations"
              }
              active={activeGroup === g.key}
              idPrefix={RIGHTSIZING_GROUP_PREFIX}
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
                  {selected.severity ? (
                    <SeverityBadge severity={selected.severity} />
                  ) : null}
                </div>

                <DrawerSection title="Recommendation">
                  <DrawerField label="Current type" mono>
                    {selected.currentType ?? "—"}
                  </DrawerField>
                  <DrawerField label="Recommended type" mono>
                    {selected.recommendedType ?? "—"}
                  </DrawerField>
                  <DrawerField label="Current cost">
                    {formatCurrency(selected.currentMonthlyCost)}
                  </DrawerField>
                  <DrawerField label="Projected cost">
                    {formatCurrency(selected.projectedMonthlyCost)}
                  </DrawerField>
                  <DrawerField label="Estimated savings">
                    {formatCurrency(selected.estimatedMonthlySavings)}
                  </DrawerField>
                  <DrawerField label="Savings %">
                    {typeof selected.savingsPercent === "number"
                      ? `${selected.savingsPercent.toFixed(0)}%`
                      : "—"}
                  </DrawerField>
                  <DrawerField label="CPU utilization">
                    {typeof selected.cpuUtilization === "number"
                      ? `${selected.cpuUtilization.toFixed(0)}%`
                      : "—"}
                  </DrawerField>
                  <DrawerField label="Memory utilization">
                    {typeof selected.memoryUtilization === "number"
                      ? `${selected.memoryUtilization.toFixed(0)}%`
                      : "—"}
                  </DrawerField>
                  <DrawerField label="Confidence">
                    {selected.confidence ? formatEnum(selected.confidence) : "—"}
                  </DrawerField>
                  <DrawerField label="Region">{selected.region ?? "—"}</DrawerField>
                </DrawerSection>
              </div>

              <SheetFooter>
                <Button onClick={() => setApplyTarget(selected)}>
                  <Scaling className="h-4 w-4" />
                  Apply resize
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ApplyResizeDialog
        open={Boolean(applyTarget)}
        onOpenChange={(open) => !open && setApplyTarget(null)}
        recommendation={applyTarget}
        onApplied={() => setSelectedId(null)}
      />
    </div>
  );
}
