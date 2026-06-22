"use client";

import * as React from "react";
import {
  MoonStar,
  PiggyBank,
  Power,
  Scaling,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { actionError, notifyActionResult } from "@/components/actions/action-result";
import { ApplyResizeDialog } from "@/components/actions/apply-resize-dialog";
import { RecommendationMenu } from "@/components/optimize/recommendation-menu";
import { ProviderBadge } from "@/components/shared/badges";
import {
  CategoryTiles,
  type CategoryTileDatum,
} from "@/components/shared/category-group";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { groupByServiceType, serviceKeyOf } from "@/lib/constants";
import { useApplyIdle } from "@/lib/hooks/actions";
import {
  useCleanupCandidates,
  useCostSummary,
  useIdleResources,
  useRightsizing,
} from "@/lib/hooks";
import type {
  RecommendationType,
  RightsizingRecommendation,
} from "@/lib/types";
import { cn, formatCurrency, formatEnum } from "@/lib/utils";

type OptimizeTab = "overview" | "cleanup" | "idle" | "rightsizing";

interface Opportunity {
  key: string;
  type: RecommendationType;
  id: string;
  name: string;
  provider?: string;
  resourceType?: string;
  detail: string;
  savings: number;
  recommendation?: RightsizingRecommendation;
}

const SOURCE_LABEL: Record<string, string> = {
  idle: "Idle",
  rightsizing: "Rightsizing",
  cleanup: "Cleanup",
};

export function OverviewPanel({
  onNavigate,
}: {
  onNavigate?: (tab: OptimizeTab) => void;
}) {
  const idle = useIdleResources();
  const rightsizing = useRightsizing();
  const cleanup = useCleanupCandidates();
  const costSummary = useCostSummary();
  const applyIdle = useApplyIdle();

  const [applyTarget, setApplyTarget] =
    React.useState<RightsizingRecommendation | null>(null);
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null);

  const idleList = idle.data ?? [];
  const rightsizingList = rightsizing.data ?? [];
  const cleanupList = cleanup.data ?? [];

  // Every opportunity across the three engines, carrying its service type so we
  // can both summarize by category and filter the highlights list.
  const allOpportunities = React.useMemo<Opportunity[]>(() => {
    const out: Opportunity[] = [];
    const idleData = idle.data ?? [];
    const rightsizingData = rightsizing.data ?? [];
    const cleanupData = cleanup.data ?? [];
    for (const r of idleData) {
      out.push({
        key: `idle-${r.id}`,
        type: "idle",
        id: r.id,
        name: r.resourceName,
        provider: r.provider,
        resourceType: r.resourceType,
        detail: r.recommendation ?? `${formatEnum(r.resourceType)} · idle`,
        savings: r.estimatedMonthlySavings ?? 0,
      });
    }
    for (const r of rightsizingData) {
      out.push({
        key: `rightsizing-${r.id}`,
        type: "rightsizing",
        id: r.id,
        name: r.resourceName,
        provider: r.provider,
        resourceType: r.resourceType,
        detail:
          r.currentType || r.recommendedType
            ? `${r.currentType ?? "—"} → ${r.recommendedType ?? "—"}`
            : formatEnum(r.resourceType),
        savings: r.estimatedMonthlySavings ?? 0,
        recommendation: r,
      });
    }
    for (const c of cleanupData) {
      out.push({
        key: `cleanup-${c.id}`,
        type: "cleanup",
        id: c.id,
        name: c.resourceName,
        provider: c.provider,
        resourceType: c.resourceType,
        detail: c.reason ?? formatEnum(c.recommendedAction),
        savings: c.estimatedMonthlySavings ?? 0,
      });
    }
    return out;
  }, [idle.data, rightsizing.data, cleanup.data]);

  // Per-service summary tiles (count + total estimated savings).
  const categoryTiles = React.useMemo<CategoryTileDatum[]>(
    () =>
      groupByServiceType(allOpportunities, (o) => o.resourceType).map((g) => ({
        key: g.key,
        meta: g.meta,
        count: g.items.length,
        metric: formatCurrency(
          g.items.reduce((acc, o) => acc + o.savings, 0),
          { compact: true },
        ),
        metricCaption: "/mo",
      })),
    [allOpportunities],
  );

  React.useEffect(() => {
    if (
      activeGroup &&
      !categoryTiles.some((t) => t.key === activeGroup)
    ) {
      setActiveGroup(null);
    }
  }, [categoryTiles, activeGroup]);

  const activeGroupLabel = categoryTiles.find((t) => t.key === activeGroup)
    ?.meta.label;

  // Highlights list: filtered by the active category tile (if any), top 8.
  const opportunities = React.useMemo<Opportunity[]>(() => {
    const filtered = activeGroup
      ? allOpportunities.filter(
          (o) => serviceKeyOf(o.resourceType) === activeGroup,
        )
      : allOpportunities;
    return [...filtered].sort((a, b) => b.savings - a.savings).slice(0, 8);
  }, [allOpportunities, activeGroup]);

  const isLoading =
    idle.isLoading || rightsizing.isLoading || cleanup.isLoading;

  const aggregateSavings =
    costSummary.data?.potentialMonthlySavings ??
    [...idleList, ...rightsizingList, ...cleanupList].reduce(
      (acc, r) => acc + (r.estimatedMonthlySavings ?? 0),
      0,
    );

  const handleApplyIdle = (id: string) =>
    applyIdle.mutate(
      { id },
      {
        onSuccess: (result) => notifyActionResult(result, "Stop requested"),
        onError: (err) => toast.error(actionError(err, "Couldn't stop resource")),
      },
    );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Potential savings"
          value={formatCurrency(aggregateSavings, { compact: true })}
          icon={PiggyBank}
          isLoading={costSummary.isLoading && isLoading}
          accent
          hint="per month"
        />
        <StatCard
          label="Cleanup candidates"
          value={cleanupList.length}
          icon={Trash2}
          isLoading={cleanup.isLoading}
          hint="orphaned & wasteful"
        />
        <StatCard
          label="Idle resources"
          value={idleList.length}
          icon={MoonStar}
          isLoading={idle.isLoading}
          hint="low utilization"
        />
        <StatCard
          label="Rightsizing"
          value={rightsizingList.length}
          icon={Scaling}
          isLoading={rightsizing.isLoading}
          hint="over-provisioned"
        />
      </div>

      {isLoading ? (
        <CategoryTiles data={[]} isLoading skeletonCount={4} />
      ) : categoryTiles.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Savings by service
          </p>
          <CategoryTiles
            data={categoryTiles}
            caption="opportunities"
            activeKey={activeGroup}
            onSelect={(key) =>
              setActiveGroup((prev) => (prev === key ? null : key))
            }
          />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Top savings opportunities</CardTitle>
              <CardDescription>
                {activeGroupLabel
                  ? `Highest-impact ${activeGroupLabel} recommendations.`
                  : "The highest-impact recommendations across every engine."}
              </CardDescription>
            </div>
            {activeGroup ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveGroup(null)}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No opportunities yet"
              description="Run the analyzers on each tab to surface savings across cleanup, idle and rightsizing."
              className="border-0"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {opportunities.map((opp) => (
                <li
                  key={opp.key}
                  className={cn(
                    "flex items-center gap-3 py-3 first:pt-0 last:pb-0",
                    onNavigate && "cursor-pointer",
                  )}
                  onClick={
                    onNavigate
                      ? () => onNavigate(opp.type as OptimizeTab)
                      : undefined
                  }
                >
                  <ProviderBadge provider={opp.provider} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{opp.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {opp.detail}
                    </p>
                  </div>
                  <Badge variant="muted" className="hidden sm:inline-flex">
                    {SOURCE_LABEL[String(opp.type)] ?? "Optimize"}
                  </Badge>
                  <span className="w-20 text-right text-sm font-medium tabular-nums">
                    {formatCurrency(opp.savings)}
                  </span>
                  <RecommendationMenu
                    type={opp.type}
                    id={opp.id}
                    onApply={
                      opp.type === "idle"
                        ? () => handleApplyIdle(opp.id)
                        : opp.type === "rightsizing" && opp.recommendation
                          ? () => setApplyTarget(opp.recommendation ?? null)
                          : undefined
                    }
                    applyLabel={opp.type === "idle" ? "Apply (stop)" : "Apply resize"}
                    applyIcon={opp.type === "idle" ? Power : Scaling}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ApplyResizeDialog
        open={Boolean(applyTarget)}
        onOpenChange={(open) => !open && setApplyTarget(null)}
        recommendation={applyTarget}
      />
    </div>
  );
}
