"use client";

import {
  Activity,
  Calendar,
  Cloud,
  Globe,
  Layers,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { BreakdownDonut } from "@/components/charts/breakdown-donut";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { CostTrendChart } from "@/components/charts/cost-trend-chart";
import { SeverityBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProviderMeta } from "@/lib/constants";
import {
  useCostByProvider,
  useCostByRegion,
  useCostByService,
  useCostSummary,
  useCostTrend,
  useSavingsOpportunities,
} from "@/lib/hooks";
import type { SavingsOpportunity } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function CostExplorerPage() {
  const costSummary = useCostSummary();
  const costTrend = useCostTrend();
  const costByProvider = useCostByProvider();
  const costByService = useCostByService();
  const costByRegion = useCostByRegion();
  const savings = useSavingsOpportunities();

  const summary = costSummary.data;
  const changePercent = summary?.changePercent;

  const trend = costTrend.data ?? [];

  const providerData = (costByProvider.data ?? []).map((row) => {
    const meta = getProviderMeta(row.provider);
    return { label: meta.short, value: row.cost, color: meta.color };
  });

  const serviceData = [...(costByService.data ?? [])]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map((row) => ({ label: row.service, value: row.cost }));

  const regionData = [...(costByRegion.data ?? [])]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map((row) => ({ label: row.region, value: row.cost }));

  const savingsColumns: DataTableColumn<SavingsOpportunity>[] = [
    {
      key: "opportunity",
      header: "Opportunity",
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{o.category}</p>
          {o.description ? (
            <p className="truncate text-xs text-muted-foreground">
              {o.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "count",
      header: "Count",
      align: "right",
      cell: (o) => <span className="tabular-nums">{o.count ?? "—"}</span>,
    },
    {
      key: "savings",
      header: "Est. monthly savings",
      align: "right",
      cell: (o) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(o.estimatedMonthlySavings)}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (o) => <SeverityBadge severity={o.severity} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Explorer"
        description="Break down spend across clouds, services and regions to find where the money goes."
        icon={Wallet}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="This month"
          value={formatCurrency(summary?.currentMonthCost, { compact: true })}
          icon={Wallet}
          accent
          isLoading={costSummary.isLoading}
          delta={
            changePercent !== undefined
              ? {
                  value: changePercent,
                  positiveIsGood: false,
                  label: "vs last month",
                }
              : undefined
          }
        />
        <StatCard
          label="Last month"
          value={formatCurrency(summary?.lastMonthCost, { compact: true })}
          icon={Calendar}
          isLoading={costSummary.isLoading}
          hint="previous period"
        />
        <StatCard
          label="Forecast"
          value={formatCurrency(summary?.forecastCost, { compact: true })}
          icon={TrendingUp}
          isLoading={costSummary.isLoading}
          hint="projected end of month"
        />
        <StatCard
          label="Daily avg"
          value={formatCurrency(summary?.dailyAverage, { compact: true })}
          icon={Activity}
          isLoading={costSummary.isLoading}
          hint="spend per day"
        />
        <StatCard
          label="Potential savings"
          value={formatCurrency(summary?.potentialMonthlySavings, {
            compact: true,
          })}
          icon={PiggyBank}
          isLoading={costSummary.isLoading}
          hint="per month"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost trend</CardTitle>
          <CardDescription>Daily spend over the recent period</CardDescription>
        </CardHeader>
        <CardContent>
          {costTrend.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : costTrend.isError ? (
            <ErrorState
              error={costTrend.error}
              onRetry={() => costTrend.refetch()}
              className="border-0"
            />
          ) : trend.length ? (
            <CostTrendChart data={trend} />
          ) : (
            <EmptyState
              icon={Wallet}
              title="No cost data yet"
              description="Connect an account and run a sync to start tracking spend."
              className="border-0"
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by provider</CardTitle>
            <CardDescription>Share of cost across clouds</CardDescription>
          </CardHeader>
          <CardContent>
            {costByProvider.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : costByProvider.isError ? (
              <ErrorState
                error={costByProvider.error}
                onRetry={() => costByProvider.refetch()}
                className="border-0"
              />
            ) : providerData.length ? (
              <BreakdownDonut data={providerData} centerLabel="Spend" />
            ) : (
              <EmptyState
                icon={Cloud}
                title="No breakdown"
                description="Provider spend will appear once costs are ingested."
                className="border-0"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by service</CardTitle>
            <CardDescription>Top services by cost</CardDescription>
          </CardHeader>
          <CardContent>
            {costByService.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : costByService.isError ? (
              <ErrorState
                error={costByService.error}
                onRetry={() => costByService.refetch()}
                className="border-0"
              />
            ) : serviceData.length ? (
              <CategoryBarChart data={serviceData} />
            ) : (
              <EmptyState
                icon={Layers}
                title="No service costs"
                description="Service-level spend will appear once costs are ingested."
                className="border-0"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spend by region</CardTitle>
          <CardDescription>Top regions by cost</CardDescription>
        </CardHeader>
        <CardContent>
          {costByRegion.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : costByRegion.isError ? (
            <ErrorState
              error={costByRegion.error}
              onRetry={() => costByRegion.refetch()}
              className="border-0"
            />
          ) : regionData.length ? (
            <CategoryBarChart data={regionData} />
          ) : (
            <EmptyState
              icon={Globe}
              title="No regional costs"
              description="Region-level spend will appear once costs are ingested."
              className="border-0"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Savings opportunities</CardTitle>
          <CardDescription>Where you could trim spend</CardDescription>
        </CardHeader>
        <CardContent>
          {savings.isError ? (
            <ErrorState
              error={savings.error}
              onRetry={() => savings.refetch()}
              className="border-0"
            />
          ) : (
            <DataTable
              columns={savingsColumns}
              data={savings.data ?? []}
              getRowId={(o) => o.id ?? o.category}
              isLoading={savings.isLoading}
              emptyIcon={PiggyBank}
              emptyTitle="No savings opportunities"
              emptyDescription="Run analyses across cost, idle and rightsizing to surface savings."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
