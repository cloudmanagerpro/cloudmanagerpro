"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Boxes, Search, X } from "lucide-react";

import { BulkActionBar } from "@/components/actions/bulk-action-bar";
import { ResourceActionPanel } from "@/components/actions/resource-action-panel";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import {
  ProviderBadge,
  StatusBadge,
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
import { DrawerField, DrawerSection, TagPills } from "@/components/shared/detail";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PROVIDERS,
  RESOURCE_STATUSES,
  WASTE_STATES,
  getServiceMeta,
  groupByServiceType,
} from "@/lib/constants";
import { useResource, useResources } from "@/lib/hooks";
import type { CloudResource, ResourceFilters } from "@/lib/types";
import { cn, formatCurrency, formatDateTime, formatEnum, sum } from "@/lib/utils";

const RESOURCES_GROUP_PREFIX = "resources";

const ALL = "ALL";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ResourcesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [provider, setProvider] = React.useState<string>(ALL);
  const [status, setStatus] = React.useState<string>(ALL);
  const [wasteState, setWasteState] = React.useState<string>(ALL);
  const [resourceType, setResourceType] = React.useState<string>(ALL);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [view, setView] = React.useState<GroupView>("grouped");
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null);

  const debouncedSearch = useDebounced(search);

  const filters: ResourceFilters = {
    search: debouncedSearch || undefined,
    provider: provider === ALL ? undefined : (provider as ResourceFilters["provider"]),
    status: status === ALL ? undefined : status,
    wasteState: wasteState === ALL ? undefined : wasteState,
    resourceType: resourceType === ALL ? undefined : resourceType,
  };

  const { data, isLoading, isError, error, refetch } = useResources(filters);
  const resources = React.useMemo(() => data ?? [], [data]);

  // Resources mutate asynchronously on the backend (post-action re-sync), so we
  // nudge a refetch shortly after an action to pick up the new state.
  const scheduleRefresh = React.useCallback(() => {
    const t = setTimeout(
      () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
      2500,
    );
    return () => clearTimeout(t);
  }, [queryClient]);

  const toggleRow = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Select/clear an arbitrary subset (the whole flat list, or one group's rows).
  const toggleSubset = (ids: string[], select: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const clearSelection = () => setChecked(new Set());

  const selectedResources = React.useMemo(
    () => resources.filter((r) => checked.has(r.id)),
    [resources, checked],
  );

  // Group dynamically off `resourceType` (falls back to `service`) so new
  // backend types (S3_BUCKET, RDS_INSTANCE, …) light up automatically.
  const groups = React.useMemo(
    () => groupByServiceType(resources, (r) => r.resourceType || r.service),
    [resources],
  );

  const tiles = React.useMemo<CategoryTileDatum[]>(
    () =>
      groups.map((g) => ({
        key: g.key,
        meta: g.meta,
        count: g.items.length,
        metric: formatCurrency(
          sum(g.items.map((r) => r.monthlyCost)),
          { compact: true },
        ),
        metricCaption: "/mo",
      })),
    [groups],
  );

  // Reset a stale quick-filter if its group disappears after a filter change.
  React.useEffect(() => {
    if (activeGroup && !groups.some((g) => g.key === activeGroup)) {
      setActiveGroup(null);
    }
  }, [groups, activeGroup]);

  const visibleGroups = activeGroup
    ? groups.filter((g) => g.key === activeGroup)
    : groups;

  const handleTileSelect = (key: string) => {
    setActiveGroup((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        // Defer so the section is in the DOM before we scroll to it.
        setTimeout(() => scrollToGroup(RESOURCES_GROUP_PREFIX, next), 0);
      }
      return next;
    });
  };

  const typeOptions = React.useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => r.resourceType && set.add(r.resourceType));
    if (resourceType !== ALL) set.add(resourceType);
    return Array.from(set).sort();
  }, [resources, resourceType]);

  const topByCost = React.useMemo(() => {
    return [...resources]
      .filter((r) => (r.monthlyCost ?? 0) > 0)
      .sort((a, b) => (b.monthlyCost ?? 0) - (a.monthlyCost ?? 0))
      .slice(0, 6)
      .map((r) => ({ label: r.name, value: r.monthlyCost ?? 0 }));
  }, [resources]);

  const hasFilters =
    provider !== ALL ||
    status !== ALL ||
    wasteState !== ALL ||
    resourceType !== ALL ||
    Boolean(search);

  const clearFilters = () => {
    setSearch("");
    setProvider(ALL);
    setStatus(ALL);
    setWasteState(ALL);
    setResourceType(ALL);
  };

  const baseColumns: DataTableColumn<CloudResource>[] = [
    {
      key: "name",
      header: "Resource",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name || r.externalId || "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatEnum(r.resourceType)}
            {r.cloudAccountName ? ` · ${r.cloudAccountName}` : ""}
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
      key: "region",
      header: "Region",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{r.region ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "waste",
      header: "Waste",
      cell: (r) => <WasteBadge wasteState={r.wasteState} />,
    },
    {
      key: "cost",
      header: "Monthly cost",
      align: "right",
      cell: (r) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(r.monthlyCost)}
        </span>
      ),
    },
  ];

  // Build columns for a given subset of rows so the header "select all" reflects
  // (and toggles) just those rows — whether that's the flat list or one group.
  const buildColumns = (
    rows: CloudResource[],
  ): DataTableColumn<CloudResource>[] => {
    const ids = rows.map((r) => r.id);
    const selectedInSubset = ids.filter((id) => checked.has(id)).length;
    const allSel = rows.length > 0 && selectedInSubset === rows.length;
    const someSel = selectedInSubset > 0 && !allSel;
    return [
      {
        key: "select",
        header: (
          <Checkbox
            checked={allSel ? true : someSel ? "indeterminate" : false}
            onCheckedChange={() => toggleSubset(ids, !allSel)}
            aria-label="Select all"
          />
        ),
        headerClassName: "w-10",
        className: "w-10",
        cell: (r) => (
          <div onClick={(e) => e.stopPropagation()} className="flex">
            <Checkbox
              checked={checked.has(r.id)}
              onCheckedChange={() => toggleRow(r.id)}
              aria-label={`Select ${r.name}`}
            />
          </div>
        ),
      },
      ...baseColumns,
    ];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Explore and act on every resource discovered across your cloud accounts."
        icon={Boxes}
        actions={<ViewToggle value={view} onChange={setView} />}
      />

      {topByCost.length >= 3 ? (
        <div className="rounded-xl border border-border/70 bg-card p-5">
          <p className="mb-3 text-sm font-medium">Most expensive resources</p>
          <CategoryBarChart data={topByCost} height={200} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources…"
            className="pl-9"
          />
        </div>

        <FilterSelect
          value={provider}
          onChange={setProvider}
          placeholder="Provider"
          options={PROVIDERS.map((p) => ({ value: p, label: p }))}
        />
        <FilterSelect
          value={resourceType}
          onChange={setResourceType}
          placeholder="Type"
          options={typeOptions.map((t) => ({ value: t, label: formatEnum(t) }))}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="Status"
          options={RESOURCE_STATUSES.map((s) => ({
            value: s,
            label: formatEnum(s),
          }))}
        />
        <FilterSelect
          value={wasteState}
          onChange={setWasteState}
          placeholder="Waste"
          options={WASTE_STATES.map((w) => ({ value: w, label: formatEnum(w) }))}
        />

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        ) : null}

        <span className="text-sm text-muted-foreground sm:ml-auto">
          {isLoading ? "Loading…" : `${resources.length} resources`}
        </span>
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : view === "flat" ? (
        <DataTable
          columns={buildColumns(resources)}
          data={resources}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyIcon={Boxes}
          emptyTitle={hasFilters ? "No matching resources" : "No resources yet"}
          emptyDescription={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "Add a cloud account and run a sync to discover resources."
          }
          className={selectedResources.length ? "mb-20" : undefined}
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <CategoryTiles data={[]} isLoading skeletonCount={6} />
          {Array.from({ length: 3 }).map((_, i) => (
            <CategorySectionSkeleton key={i} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={hasFilters ? "No matching resources" : "No resources yet"}
          description={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "Add a cloud account and run a sync to discover resources."
          }
        />
      ) : (
        <div className={cn("space-y-4", selectedResources.length && "mb-20")}>
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
                  {getServiceMeta(activeGroup).label}
                </span>{" "}
                only
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveGroup(null)}
              >
                <X className="h-4 w-4" />
                Show all groups
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
              idPrefix={RESOURCES_GROUP_PREFIX}
              metric={
                <>
                  {formatCurrency(sum(g.items.map((r) => r.monthlyCost)))}{" "}
                  <span className="font-normal text-muted-foreground">/mo</span>
                </>
              }
            >
              <DataTable
                columns={buildColumns(g.items)}
                data={g.items}
                getRowId={(r) => r.id}
                onRowClick={(r) => setSelectedId(r.id)}
                className="rounded-none border-0 shadow-none"
              />
            </CategorySection>
          ))}
        </div>
      )}

      <ResourceDetailSheet
        resourceId={selectedId}
        fallback={resources.find((r) => r.id === selectedId)}
        onClose={() => setSelectedId(null)}
        onActionComplete={scheduleRefresh}
      />

      <BulkActionBar
        selected={selectedResources}
        onClear={clearSelection}
        onDone={scheduleRefresh}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[150px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder.toLowerCase()}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ResourceDetailSheet({
  resourceId,
  fallback,
  onClose,
  onActionComplete,
}: {
  resourceId: string | null;
  fallback?: CloudResource;
  onClose: () => void;
  onActionComplete?: () => void;
}) {
  const { data, isLoading } = useResource(resourceId ?? "");
  const resource = data ?? fallback;

  return (
    <Sheet open={Boolean(resourceId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="truncate pr-6">
            {resource?.name ?? "Resource"}
          </SheetTitle>
          <SheetDescription>
            {resource ? formatEnum(resource.resourceType) : "Resource details"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-6">
          {!resource && isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : resource ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ProviderBadge provider={resource.provider} />
                <StatusBadge status={resource.status} />
                <WasteBadge wasteState={resource.wasteState} />
              </div>

              <ResourceActionPanel
                resource={resource}
                onActionComplete={onActionComplete}
              />

              <DrawerSection title="Details">
                <DrawerField label="Monthly cost">
                  {formatCurrency(resource.monthlyCost)}
                </DrawerField>
                <DrawerField label="Region">{resource.region ?? "—"}</DrawerField>
                <DrawerField label="Account">
                  {resource.cloudAccountName ?? "—"}
                </DrawerField>
                <DrawerField label="Service">
                  {resource.service ? formatEnum(resource.service) : "—"}
                </DrawerField>
                <DrawerField label="Resource ID" mono>
                  {resource.externalId ?? resource.id}
                </DrawerField>
                <DrawerField label="First seen">
                  {resource.firstSeenAt ? formatDateTime(resource.firstSeenAt) : "—"}
                </DrawerField>
                <DrawerField label="Last seen">
                  {resource.lastSeenAt ? formatDateTime(resource.lastSeenAt) : "—"}
                </DrawerField>
              </DrawerSection>

              <DrawerSection title="Tags">
                <TagPills tags={resource.tags} />
              </DrawerSection>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
