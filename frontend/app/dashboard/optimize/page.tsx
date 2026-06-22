"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { CleanupPanel } from "@/components/optimize/cleanup-panel";
import { IdlePanel } from "@/components/optimize/idle-panel";
import { OverviewPanel } from "@/components/optimize/overview-panel";
import { RightsizingPanel } from "@/components/optimize/rightsizing-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["overview", "cleanup", "idle", "rightsizing"] as const;
type OptimizeTab = (typeof TABS)[number];

function isTab(value: string | null): value is OptimizeTab {
  return Boolean(value) && (TABS as readonly string[]).includes(value as string);
}

function OptimizeHub() {
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState<OptimizeTab>(() => {
    const t = searchParams.get("tab");
    return isTab(t) ? t : "overview";
  });

  // Sync when the query changes (e.g. a redirect lands on ?tab=cleanup).
  React.useEffect(() => {
    const t = searchParams.get("tab");
    if (isTab(t) && t !== tab) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeTab = React.useCallback((value: string) => {
    const next = isTab(value) ? value : "overview";
    setTab(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  return (
    <Tabs value={tab} onValueChange={changeTab} className="space-y-5">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
        <TabsTrigger value="idle">Idle</TabsTrigger>
        <TabsTrigger value="rightsizing">Rightsizing</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewPanel onNavigate={changeTab} />
      </TabsContent>
      <TabsContent value="cleanup">
        <CleanupPanel />
      </TabsContent>
      <TabsContent value="idle">
        <IdlePanel />
      </TabsContent>
      <TabsContent value="rightsizing">
        <RightsizingPanel />
      </TabsContent>
    </Tabs>
  );
}

export default function OptimizePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Optimize"
        description="Find and act on savings across cleanup, idle and rightsizing — all in one place."
        icon={Sparkles}
      />
      <React.Suspense fallback={<Skeleton className="h-9 w-72" />}>
        <OptimizeHub />
      </React.Suspense>
    </div>
  );
}
