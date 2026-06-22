"use client";

import Link from "next/link";
import {
  Bell,
  Boxes,
  Cloud,
  MoonStar,
  PiggyBank,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { CostTrendChart } from "@/components/charts/cost-trend-chart";
import { BreakdownDonut } from "@/components/charts/breakdown-donut";
import {
  ProviderBadge,
  SeverityBadge,
  StatusBadge,
} from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartSkeleton, StatCardsSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
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
  useAlertLogs,
  useCloudAccounts,
  useCostByProvider,
  useCostSummary,
  useCostTrend,
  useIdleResources,
  useSavingsOpportunities,
  useSyncJobs,
  useTagCompliance,
} from "@/lib/hooks";
import { formatCurrency, formatNumber, formatRelativeTime, sum } from "@/lib/utils";

export default function OverviewPage() {
  const accounts = useCloudAccounts();
  const costSummary = useCostSummary();
  const costTrend = useCostTrend();
  const costByProvider = useCostByProvider();
  const idle = useIdleResources();
  const tags = useTagCompliance();
  const syncJobs = useSyncJobs();
  const alerts = useAlertLogs();
  const savings = useSavingsOpportunities();

  const accountList = accounts.data ?? [];
  const totalResources = sum(accountList.map((a) => a.resourceCount));
  const monthlySpend =
    costSummary.data?.currentMonthCost ?? sum(accountList.map((a) => a.monthlyCost));
  const estimatedSavings =
    costSummary.data?.potentialMonthlySavings ??
    sum((savings.data ?? []).map((o) => o.estimatedMonthlySavings));

  const providerData = (costByProvider.data ?? []).map((row) => {
    const meta = getProviderMeta(row.provider);
    return { label: meta.short, value: row.cost, color: meta.color };
  });

  const recentSyncs = (syncJobs.data ?? []).slice(0, 5);
  const recentAlerts = (alerts.data ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Spend, savings and optimization activity across your clouds."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/cost-explorer">
                <Wallet className="h-4 w-4" />
                Cost explorer
              </Link>
            </Button>
            <Button variant="gradient" asChild>
              <Link href="/dashboard/cloud-accounts?new=1">
                <Plus className="h-4 w-4" />
                Add account
              </Link>
            </Button>
          </>
        }
      />

      {accounts.isLoading && costSummary.isLoading ? (
        <StatCardsSkeleton count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Total resources"
            value={formatNumber(totalResources)}
            icon={Boxes}
            isLoading={accounts.isLoading}
            hint="across all accounts"
          />
          <StatCard
            label="Linked accounts"
            value={formatNumber(accountList.length)}
            icon={Cloud}
            isLoading={accounts.isLoading}
            hint="AWS · Azure · GCP"
          />
          <StatCard
            label="Monthly spend"
            value={formatCurrency(monthlySpend, { compact: true })}
            icon={Wallet}
            isLoading={costSummary.isLoading}
            accent
            delta={
              costSummary.data?.changePercent !== undefined
                ? {
                    value: costSummary.data.changePercent,
                    positiveIsGood: false,
                    label: "vs last month",
                  }
                : undefined
            }
          />
          <StatCard
            label="Est. savings"
            value={formatCurrency(estimatedSavings, { compact: true })}
            icon={PiggyBank}
            isLoading={costSummary.isLoading && savings.isLoading}
            hint="potential / month"
          />
          <StatCard
            label="Idle resources"
            value={formatNumber((idle.data ?? []).length)}
            icon={MoonStar}
            isLoading={idle.isLoading}
            hint="low utilization"
          />
          <StatCard
            label="Compliance"
            value={`${Math.round(tags.data?.complianceScore ?? 0)}%`}
            icon={ShieldCheck}
            isLoading={tags.isLoading}
            hint="tag coverage"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cost trend</CardTitle>
            <CardDescription>Daily spend over the recent period</CardDescription>
          </CardHeader>
          <CardContent>
            {costTrend.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (costTrend.data ?? []).length ? (
              <CostTrendChart data={costTrend.data ?? []} />
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

        <Card>
          <CardHeader>
            <CardTitle>Spend by provider</CardTitle>
            <CardDescription>Share of monthly cost</CardDescription>
          </CardHeader>
          <CardContent>
            {costByProvider.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent sync jobs</CardTitle>
              <CardDescription>Latest resource discovery runs</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/logs">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {syncJobs.isLoading ? (
              <ListSkeleton />
            ) : recentSyncs.length ? (
              <ul className="divide-y divide-border/60">
                {recentSyncs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <ProviderBadge provider={job.provider} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {job.cloudAccountName ?? "Account"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatNumber(job.resourcesDiscovered ?? 0)} resources ·{" "}
                        {formatRelativeTime(job.finishedAt ?? job.startedAt)}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Cloud}
                title="No syncs yet"
                description="Resource discovery runs will show up here."
                className="border-0 py-10"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent alerts</CardTitle>
              <CardDescription>Notifications sent recently</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/alerts">Settings</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {alerts.isLoading ? (
              <ListSkeleton />
            ) : recentAlerts.length ? (
              <ul className="divide-y divide-border/60">
                {recentAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {alert.subject ?? alert.alertType ?? "Alert"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {alert.channel ? `${alert.channel} · ` : ""}
                        {formatRelativeTime(alert.createdAt)}
                      </p>
                    </div>
                    {alert.severity ? (
                      <SeverityBadge severity={alert.severity} />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Bell}
                title="No alerts"
                description="You're all caught up. Configure alerts to stay informed."
                className="border-0 py-10"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
