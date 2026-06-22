"use client";

import * as React from "react";
import {
  Cloud,
  Loader2,
  MoreHorizontal,
  Plus,
  Plug,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AddAccountDialog } from "@/components/forms/add-account-dialog";
import {
  ProviderBadge,
  SimulatedBadge,
  StatusBadge,
} from "@/components/shared/badges";
import { DrawerField, DrawerSection } from "@/components/shared/detail";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import {
  useCloudAccounts,
  useDeleteCloudAccount,
  useSyncCloudAccount,
  useTestCloudAccount,
} from "@/lib/hooks";
import type { CloudAccount } from "@/lib/types";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/lib/utils";

export default function CloudAccountsPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CloudAccount | null>(
    null,
  );

  const { data, isLoading, isError, error, refetch } = useCloudAccounts();
  const accounts = data ?? [];

  const del = useDeleteCloudAccount();
  const test = useTestCloudAccount();
  const sync = useSyncCloudAccount();

  // Open the add dialog when navigated with ?new=1 (e.g. from the command palette).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setAddOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleTest = (id: string) => {
    test.mutate(id, {
      onSuccess: (result) => {
        if (result?.success === false) {
          toast.error(result.message ?? "Connection failed");
        } else {
          toast.success(result?.message ?? "Connection successful");
        }
      },
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Connection failed"),
    });
  };

  const handleSync = (id: string) => {
    sync.mutate(id, {
      onSuccess: () => toast.success("Sync started", { description: "Discovering resources…" }),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Couldn't start sync"),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Account removed");
        setDeleteTarget(null);
        if (selectedId === deleteTarget.id) setSelectedId(null);
      },
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Couldn't remove account"),
    });
  };

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  const columns: DataTableColumn<CloudAccount>[] = [
    {
      key: "name",
      header: "Account",
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{a.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {a.accountIdentifier ?? a.region ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (a) => <ProviderBadge provider={a.provider} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: "resources",
      header: "Resources",
      align: "right",
      cell: (a) => (
        <span className="tabular-nums">{formatNumber(a.resourceCount ?? 0)}</span>
      ),
    },
    {
      key: "cost",
      header: "Monthly cost",
      align: "right",
      cell: (a) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(a.monthlyCost)}
        </span>
      ),
    },
    {
      key: "lastSync",
      header: "Last synced",
      cell: (a) => (
        <span className="text-sm text-muted-foreground">
          {formatRelativeTime(a.lastSyncedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (a) => {
        const isSyncing = sync.isPending && sync.variables === a.id;
        return (
          <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Actions">
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleSync(a.id)}>
                  <RefreshCw className="h-4 w-4" />
                  Sync now
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleTest(a.id)}>
                  <Plug className="h-4 w-4" />
                  Test connection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteTarget(a)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cloud Accounts"
        description="Connect and manage your AWS, Azure and GCP accounts."
        icon={Cloud}
        actions={
          <Button variant="gradient" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add account
          </Button>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={accounts}
          getRowId={(a) => a.id}
          isLoading={isLoading}
          onRowClick={(a) => setSelectedId(a.id)}
          emptyIcon={Cloud}
          emptyTitle="No cloud accounts yet"
          emptyDescription="Connect your first provider to start discovering resources and costs."
          emptyAction={
            <Button variant="gradient" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add cloud account
            </Button>
          }
        />
      )}

      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} />

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="truncate pr-6">{selected.name}</SheetTitle>
                <SheetDescription>Cloud account details</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <ProviderBadge provider={selected.provider} />
                  <StatusBadge status={selected.status} />
                  {selected.provider !== "AWS" ? <SimulatedBadge /> : null}
                </div>

                {selected.errorMessage ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {selected.errorMessage}
                  </p>
                ) : null}

                <DrawerSection title="Details">
                  <DrawerField label="Identifier" mono>
                    {selected.accountIdentifier ?? "—"}
                  </DrawerField>
                  <DrawerField label="Region">{selected.region ?? "—"}</DrawerField>
                  <DrawerField label="Resources">
                    {formatNumber(selected.resourceCount ?? 0)}
                  </DrawerField>
                  <DrawerField label="Monthly cost">
                    {formatCurrency(selected.monthlyCost)}
                  </DrawerField>
                  <DrawerField label="Last synced">
                    {formatRelativeTime(selected.lastSyncedAt)}
                  </DrawerField>
                  {selected.roleArn ? (
                    <DrawerField label="Role ARN" mono>
                      {selected.roleArn}
                    </DrawerField>
                  ) : null}
                </DrawerSection>
              </div>
              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => handleTest(selected.id)}
                  disabled={test.isPending}
                >
                  <Plug className="h-4 w-4" />
                  Test
                </Button>
                <Button
                  variant="gradient"
                  onClick={() => handleSync(selected.id)}
                  disabled={sync.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync now
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove account?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              and its discovered resources from CloudManagerPro. Your cloud
              provider is not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={del.isPending}
            >
              {del.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
