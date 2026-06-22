"use client";

import * as React from "react";
import {
  Boxes,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Tags,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { DEFAULT_REQUIRED_TAGS, groupByServiceType } from "@/lib/constants";
import { useAnalyzeTags, useTagCompliance } from "@/lib/hooks";
import type { TagComplianceResult } from "@/lib/types";
import { formatEnum, formatNumber, formatPercent } from "@/lib/utils";

const TAG_GROUP_PREFIX = "tags";

/** Per-service compliance roll-up (compliant count + score). */
function complianceStat(items: TagComplianceResult[]) {
  const total = items.length;
  const compliant = items.filter((r) => r.compliant === true).length;
  const score = total ? Math.round((compliant / total) * 100) : 0;
  return { total, compliant, score };
}

export default function TagCompliancePage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<GroupView>("grouped");
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null);

  const tags = useTagCompliance();
  const analyze = useAnalyzeTags();

  const summary = tags.data;
  const results = React.useMemo(() => summary?.results ?? [], [summary]);
  const score = Math.round(summary?.complianceScore ?? 0);
  const requiredTags = summary?.requiredTags ?? DEFAULT_REQUIRED_TAGS;

  const totalResources = summary?.totalResources ?? results.length;
  const compliantResources =
    summary?.compliantResources ??
    results.filter((r) => r.compliant === true).length;
  const nonCompliantResources =
    summary?.nonCompliantResources ??
    results.filter((r) => r.compliant === false).length;

  const selected = results.find((r) => r.id === selectedId) ?? null;
  const selectedMissing = selected?.missingTags ?? [];
  const selectedPresent = selected?.presentTags ?? [];

  const groups = React.useMemo(
    () => groupByServiceType(results, (r) => r.resourceType),
    [results],
  );
  const tiles = React.useMemo<CategoryTileDatum[]>(
    () =>
      groups.map((g) => {
        const stat = complianceStat(g.items);
        return {
          key: g.key,
          meta: g.meta,
          count: stat.total,
          metric: `${stat.score}%`,
          metricCaption: "compliant",
        };
      }),
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
      if (next) setTimeout(() => scrollToGroup(TAG_GROUP_PREFIX, next), 0);
      return next;
    });

  const handleAnalyze = () => {
    analyze.mutate(undefined, {
      onSuccess: () =>
        toast.success("Analysis complete", {
          description: "Tag compliance has been refreshed.",
        }),
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't run analysis",
        ),
    });
  };

  const columns: DataTableColumn<TagComplianceResult>[] = [
    {
      key: "resource",
      header: "Resource",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.resourceName}</p>
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
      key: "compliant",
      header: "Compliant",
      cell: (r) =>
        r.compliant ? (
          <Badge variant="success">Compliant</Badge>
        ) : (
          <Badge variant="destructive">Non-compliant</Badge>
        ),
    },
    {
      key: "missing",
      header: "Missing tags",
      cell: (r) => {
        const missing = r.missingTags ?? [];
        if (!missing.length) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {missing.map((tag) => (
              <Badge key={tag} variant="warning">
                {tag}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: "severity",
      header: "Severity",
      cell: (r) => <SeverityBadge severity={r.severity} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tag Compliance"
        description="Audit and enforce required tagging policies across every cloud resource."
        icon={Tags}
        actions={
          <>
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
                  <RefreshCw className="h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Compliance score</CardTitle>
            <CardDescription>Resources meeting all required tags</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tags.isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <p className="text-4xl font-semibold tracking-tight">{score}%</p>
            )}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${score}%` }}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Required tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {requiredTags.map((tag) => (
                  <Badge key={tag} variant="muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          <StatCard
            label="Total"
            value={formatNumber(totalResources)}
            icon={Boxes}
            isLoading={tags.isLoading}
            hint="resources audited"
          />
          <StatCard
            label="Compliant"
            value={formatNumber(compliantResources)}
            icon={ShieldCheck}
            isLoading={tags.isLoading}
            hint="meet policy"
          />
          <StatCard
            label="Non-compliant"
            value={formatNumber(nonCompliantResources)}
            icon={ShieldAlert}
            isLoading={tags.isLoading}
            hint="missing tags"
          />
        </div>
      </div>

      {tags.isError ? (
        <ErrorState error={tags.error} onRetry={() => tags.refetch()} />
      ) : view === "flat" ? (
        <DataTable
          columns={columns}
          data={results}
          getRowId={(r) => r.id}
          isLoading={tags.isLoading}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyIcon={Tags}
          emptyTitle="No results — run an analysis"
          emptyDescription="Run an analysis to audit tag compliance across your resources."
        />
      ) : tags.isLoading ? (
        <div className="space-y-4">
          <CategoryTiles data={[]} isLoading skeletonCount={5} />
          {Array.from({ length: 3 }).map((_, i) => (
            <CategorySectionSkeleton key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No results — run an analysis"
          description="Run an analysis to audit tag compliance across your resources."
        />
      ) : (
        <div className="space-y-4">
          <CategoryTiles
            data={tiles}
            caption="resources"
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
          {visibleGroups.map((g) => {
            const stat = complianceStat(g.items);
            return (
              <CategorySection
                key={g.key}
                meta={g.meta}
                count={g.items.length}
                caption={g.items.length === 1 ? "resource" : "resources"}
                active={activeGroup === g.key}
                idPrefix={TAG_GROUP_PREFIX}
                metric={
                  <>
                    {stat.score}%{" "}
                    <span className="font-normal text-muted-foreground">
                      · {stat.compliant}/{stat.total} compliant
                    </span>
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
            );
          })}
        </div>
      )}

      <Sheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="truncate pr-6">
              {selected?.resourceName ?? "Resource"}
            </SheetTitle>
            <SheetDescription>
              {selected
                ? formatEnum(selected.resourceType)
                : "Tag compliance details"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 p-6">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <ProviderBadge provider={selected.provider} />
                  {selected.compliant ? (
                    <Badge variant="success">Compliant</Badge>
                  ) : (
                    <Badge variant="destructive">Non-compliant</Badge>
                  )}
                  {selected.severity ? (
                    <SeverityBadge severity={selected.severity} />
                  ) : null}
                </div>

                <DrawerSection title="Missing tags">
                  {selectedMissing.length ? (
                    <div className="flex flex-wrap gap-1.5 p-4">
                      {selectedMissing.map((tag) => (
                        <Badge key={tag} variant="warning">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="px-4 py-3 text-sm text-muted-foreground">
                      All required tags present
                    </p>
                  )}
                </DrawerSection>

                <DrawerSection title="Present tags">
                  {selectedPresent.length ? (
                    <div className="flex flex-wrap gap-1.5 p-4">
                      {selectedPresent.map((tag) => (
                        <Badge key={tag} variant="muted">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="px-4 py-3 text-sm text-muted-foreground">—</p>
                  )}
                </DrawerSection>

                <DrawerSection title="Details">
                  <DrawerField label="Region">
                    {selected.region ?? "—"}
                  </DrawerField>
                  <DrawerField label="Score">
                    {selected.score != null
                      ? formatPercent(selected.score)
                      : "—"}
                  </DrawerField>
                </DrawerSection>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
