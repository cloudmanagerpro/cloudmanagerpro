"use client";

import { Bell, RefreshCw, ScrollText } from "lucide-react";

import {
  ProviderBadge,
  SeverityBadge,
  StatusBadge,
} from "@/components/shared/badges";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useActionLogs, useAlertLogs, useSyncLogs } from "@/lib/hooks";
import type { ActionLog, AlertLog, SyncJob } from "@/lib/types";
import { formatEnum, formatNumber, formatRelativeTime } from "@/lib/utils";

export default function LogsPage() {
  const actionLogs = useActionLogs();
  const syncLogs = useSyncLogs();
  const alertLogs = useAlertLogs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        description="A history of remediation actions, resource syncs and delivered alerts."
        icon={ScrollText}
      />

      <Tabs defaultValue="actions">
        <TabsList>
          <TabsTrigger value="actions">
            Actions
            <TabCount value={actionLogs.data?.length} />
          </TabsTrigger>
          <TabsTrigger value="sync">
            Sync
            <TabCount value={syncLogs.data?.length} />
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            <TabCount value={alertLogs.data?.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <ActionsPanel
            data={actionLogs.data ?? []}
            isLoading={actionLogs.isLoading}
            isError={actionLogs.isError}
            error={actionLogs.error}
            onRetry={() => actionLogs.refetch()}
          />
        </TabsContent>

        <TabsContent value="sync">
          <SyncPanel
            data={syncLogs.data ?? []}
            isLoading={syncLogs.isLoading}
            isError={syncLogs.isError}
            error={syncLogs.error}
            onRetry={() => syncLogs.refetch()}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel
            data={alertLogs.data ?? []}
            isLoading={alertLogs.isLoading}
            isError={alertLogs.isError}
            error={alertLogs.error}
            onRetry={() => alertLogs.refetch()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface PanelProps<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}

function TabCount({ value }: { value?: number }) {
  if (value === undefined) return null;
  return (
    <span className="text-xs font-normal text-muted-foreground">
      {formatNumber(value)}
    </span>
  );
}

function ActionsPanel({
  data,
  isLoading,
  isError,
  error,
  onRetry,
}: PanelProps<ActionLog>) {
  const columns: DataTableColumn<ActionLog>[] = [
    {
      key: "action",
      header: "Action",
      cell: (a) => (
        <span className="font-medium">
          {formatEnum(a.actionType ?? a.action)}
        </span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      cell: (a) => <span className="text-sm">{a.resourceName ?? "—"}</span>,
    },
    {
      key: "provider",
      header: "Provider",
      cell: (a) =>
        a.provider ? (
          <ProviderBadge provider={a.provider} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (a) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={a.status} />
          {a.dryRun ? <Badge variant="muted">Dry run</Badge> : null}
        </div>
      ),
    },
    {
      key: "when",
      header: "When",
      cell: (a) => (
        <span className="text-sm text-muted-foreground">
          {formatRelativeTime(a.createdAt)}
        </span>
      ),
    },
  ];

  if (isError) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(a) => a.id}
      isLoading={isLoading}
      emptyIcon={ScrollText}
      emptyTitle="No actions yet"
      emptyDescription="Cleanup and remediation actions you run will be recorded here."
    />
  );
}

function SyncPanel({
  data,
  isLoading,
  isError,
  error,
  onRetry,
}: PanelProps<SyncJob>) {
  const columns: DataTableColumn<SyncJob>[] = [
    {
      key: "account",
      header: "Account",
      cell: (j) => (
        <span className="font-medium">{j.cloudAccountName ?? "—"}</span>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (j) => <ProviderBadge provider={j.provider} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (j) => <StatusBadge status={j.status} />,
    },
    {
      key: "discovered",
      header: "Discovered",
      align: "right",
      cell: (j) => (
        <span className="tabular-nums">
          {formatNumber(j.resourcesDiscovered ?? 0)}
        </span>
      ),
    },
    {
      key: "created-updated",
      header: "Created / Updated",
      cell: (j) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {`+${j.resourcesCreated ?? 0} / ~${j.resourcesUpdated ?? 0}`}
        </span>
      ),
    },
    {
      key: "when",
      header: "When",
      cell: (j) => (
        <span className="text-sm text-muted-foreground">
          {formatRelativeTime(j.finishedAt ?? j.startedAt)}
        </span>
      ),
    },
  ];

  if (isError) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(j) => j.id}
      isLoading={isLoading}
      emptyIcon={RefreshCw}
      emptyTitle="No sync runs yet"
      emptyDescription="Resource discovery runs across your accounts will show up here."
    />
  );
}

function AlertsPanel({
  data,
  isLoading,
  isError,
  error,
  onRetry,
}: PanelProps<AlertLog>) {
  const columns: DataTableColumn<AlertLog>[] = [
    {
      key: "subject",
      header: "Subject",
      cell: (l) => (
        <span className="font-medium">
          {l.subject ?? (l.alertType ? formatEnum(l.alertType) : "Alert")}
        </span>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      cell: (l) => (
        <span className="text-sm text-muted-foreground">
          {formatEnum(l.channel)}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (l) => <SeverityBadge severity={l.severity} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (l) => <StatusBadge status={l.status} />,
    },
    {
      key: "when",
      header: "When",
      cell: (l) => (
        <span className="text-sm text-muted-foreground">
          {formatRelativeTime(l.createdAt)}
        </span>
      ),
    },
  ];

  if (isError) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(l) => l.id}
      isLoading={isLoading}
      emptyIcon={Bell}
      emptyTitle="No alerts sent"
      emptyDescription="Notifications delivered to Slack or email will be listed here."
    />
  );
}
