"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api } from "./api";
import { getToken } from "./auth";
import type {
  ActionLog,
  ActionResult,
  AlertLog,
  AlertSettings,
  AlertTestResult,
  AuthResponse,
  CloudAccount,
  CleanupCandidate,
  CostByProvider,
  CostByRegion,
  CostByService,
  CostSummary,
  CostTrendPoint,
  CreateCloudAccountRequest,
  ConnectionTestResult,
  DryRunResult,
  HealthResponse,
  IdleResource,
  LoginRequest,
  Provider,
  RightsizingRecommendation,
  SavingsOpportunity,
  Severity,
  SignupRequest,
  SyncJob,
  CloudResource,
  ResourceFilters,
  TagComplianceSummary,
  User,
} from "./types";

/** Normalize list responses whether they're a bare array or a wrapped page. */
export function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["content", "items", "data", "results", "records"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

// --- Backend<->frontend shape reconciliation --------------------------------
// The backend DTOs use some different field names than the frontend types
// (e.g. cost uses {key, amount}; the summary uses currentMonthToDate/
// projectedMonthly/totalPotentialSavings; rightsizing/idle expose
// avgCpuUtilization/cpuUtilization). These helpers map the real JSON onto the
// shapes the UI components already consume.

function rec(input: unknown): Record<string, unknown> {
  return input && typeof input === "object"
    ? (input as Record<string, unknown>)
    : {};
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && !Number.isNaN(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function normalizeCostSummary(input: unknown): CostSummary {
  const o = rec(input);
  return {
    currentMonthCost: num(o.currentMonthCost) ?? num(o.currentMonthToDate),
    lastMonthCost: num(o.lastMonthCost) ?? num(o.lastMonthTotal),
    forecastCost: num(o.forecastCost) ?? num(o.projectedMonthly),
    dailyAverage: num(o.dailyAverage),
    changePercent: num(o.changePercent),
    potentialMonthlySavings:
      num(o.potentialMonthlySavings) ?? num(o.totalPotentialSavings),
    currency: str(o.currency),
  };
}

function normalizeTrendPoint(input: unknown): CostTrendPoint {
  const o = rec(input);
  return {
    date: str(o.date) ?? "",
    cost: num(o.cost) ?? num(o.amount) ?? 0,
    forecast: num(o.forecast),
  };
}

function normalizeProviderCost(input: unknown): CostByProvider {
  const o = rec(input);
  return {
    provider: (str(o.provider) ?? str(o.key) ?? "") as Provider,
    cost: num(o.cost) ?? num(o.amount) ?? 0,
    percent: num(o.percent),
  };
}

function normalizeServiceCost(input: unknown): CostByService {
  const o = rec(input);
  return {
    service: str(o.service) ?? str(o.key) ?? "",
    provider: str(o.provider) as Provider | undefined,
    cost: num(o.cost) ?? num(o.amount) ?? 0,
  };
}

function normalizeRegionCost(input: unknown): CostByRegion {
  const o = rec(input);
  return {
    region: str(o.region) ?? str(o.key) ?? "",
    cost: num(o.cost) ?? num(o.amount) ?? 0,
  };
}

function normalizeIdle(input: unknown): IdleResource {
  const o = rec(input);
  return {
    id: str(o.id) ?? "",
    resourceId: str(o.resourceId),
    resourceName: str(o.resourceName) ?? "",
    provider: (str(o.provider) ?? "") as Provider,
    resourceType: str(o.resourceType) ?? "",
    region: str(o.region),
    metric: str(o.metric) ?? "CPU",
    avgUtilization: num(o.avgUtilization) ?? num(o.cpuUtilization),
    maxUtilization: num(o.maxUtilization),
    observationDays: num(o.observationDays),
    estimatedMonthlySavings: num(o.estimatedMonthlySavings),
    recommendation: str(o.recommendation) ?? str(o.reason),
    severity: str(o.severity) as Severity | undefined,
  };
}

function normalizeRightsizing(input: unknown): RightsizingRecommendation {
  const o = rec(input);
  const current = num(o.currentMonthlyCost);
  const savings = num(o.estimatedMonthlySavings);
  const savingsPercent =
    num(o.savingsPercent) ??
    (current && current > 0 && savings !== undefined
      ? (savings / current) * 100
      : undefined);
  return {
    id: str(o.id) ?? "",
    resourceId: str(o.resourceId),
    resourceName: str(o.resourceName) ?? "",
    provider: (str(o.provider) ?? "") as Provider,
    resourceType: str(o.resourceType) ?? "",
    region: str(o.region),
    currentType: str(o.currentType),
    recommendedType: str(o.recommendedType),
    currentMonthlyCost: current,
    projectedMonthlyCost: num(o.projectedMonthlyCost),
    estimatedMonthlySavings: savings,
    savingsPercent,
    cpuUtilization: num(o.cpuUtilization) ?? num(o.avgCpuUtilization),
    memoryUtilization: num(o.memoryUtilization),
    confidence: str(o.confidence),
    severity: str(o.severity) as Severity | undefined,
  };
}

function normalizeActionResult(input: unknown): DryRunResult {
  const o = rec(input);
  return {
    wouldSucceed: typeof o.success === "boolean" ? o.success : undefined,
    summary: str(o.message),
    message: str(o.message),
    estimatedMonthlySavings: num(o.estimatedMonthlySavings),
  };
}

export const qk = {
  me: ["me"] as const,
  health: ["health"] as const,
  cloudAccounts: ["cloud-accounts"] as const,
  cloudAccount: (id: string) => ["cloud-accounts", id] as const,
  resources: (filters?: ResourceFilters) =>
    ["resources", filters ?? {}] as const,
  resource: (id: string) => ["resources", "detail", id] as const,
  syncJobs: ["sync", "jobs"] as const,
  syncJob: (id: string) => ["sync", "jobs", id] as const,
  cleanup: ["cleanup", "candidates"] as const,
  cost: (key: string) => ["cost", key] as const,
  idle: ["idle"] as const,
  tags: ["tags", "compliance"] as const,
  rightsizing: ["rightsizing"] as const,
  alertSettings: ["settings", "alerts"] as const,
  logs: (key: string) => ["logs", key] as const,
};

// --- Auth -------------------------------------------------------------------

export function useMe(enabled = true) {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => api.get<User>("/auth/me"),
    enabled: enabled && typeof window !== "undefined" && Boolean(getToken()),
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      api.post<AuthResponse>("/auth/login", body, { auth: false }),
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (body: SignupRequest) =>
      api.post<AuthResponse>("/auth/signup", body, { auth: false }),
  });
}

export function useHealth() {
  return useQuery({
    queryKey: qk.health,
    queryFn: () => api.get<HealthResponse>("/health", undefined, { auth: false }),
    staleTime: 60_000,
    retry: false,
  });
}

// --- Cloud accounts ---------------------------------------------------------

export function useCloudAccounts() {
  return useQuery({
    queryKey: qk.cloudAccounts,
    queryFn: async () =>
      asArray<CloudAccount>(await api.get<unknown>("/cloud-accounts")),
  });
}

export function useCloudAccount(id: string) {
  return useQuery({
    queryKey: qk.cloudAccount(id),
    queryFn: () => api.get<CloudAccount>(`/cloud-accounts/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCloudAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCloudAccountRequest) =>
      api.post<CloudAccount>("/cloud-accounts", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cloudAccounts });
    },
  });
}

export function useDeleteCloudAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/cloud-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cloudAccounts });
    },
  });
}

export function useTestCloudAccount() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ConnectionTestResult>(`/cloud-accounts/${id}/test`),
  });
}

export function useSyncCloudAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<SyncJob>(`/cloud-accounts/${id}/sync`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.syncJobs });
      queryClient.invalidateQueries({ queryKey: qk.cloudAccounts });
    },
  });
}

// --- Sync -------------------------------------------------------------------

export function useSyncJobs() {
  return useQuery({
    queryKey: qk.syncJobs,
    queryFn: async () =>
      asArray<SyncJob>(await api.get<unknown>("/sync/jobs")),
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cloudAccountId: string) =>
      api.post<SyncJob>(`/sync/${cloudAccountId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.syncJobs });
    },
  });
}

// --- Resources --------------------------------------------------------------

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: qk.resources(filters),
    queryFn: async () =>
      asArray<CloudResource>(
        await api.get<unknown>("/resources", {
          provider: filters.provider,
          resourceType: filters.resourceType,
          region: filters.region,
          status: filters.status,
          wasteState: filters.wasteState,
          search: filters.search,
          tag: filters.tag,
          minCost: filters.minCost,
          maxCost: filters.maxCost,
        }),
      ),
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: qk.resource(id),
    queryFn: () => api.get<CloudResource>(`/resources/${id}`),
    enabled: Boolean(id),
  });
}

// --- Cleanup ----------------------------------------------------------------

export function useCleanupCandidates() {
  return useQuery({
    queryKey: qk.cleanup,
    queryFn: async () =>
      asArray<CleanupCandidate>(await api.get<unknown>("/cleanup/candidates")),
  });
}

export function useAnalyzeCleanup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<unknown>("/cleanup/analyze"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cleanup });
    },
  });
}

export function useCleanupDryRun() {
  return useMutation({
    mutationFn: async (id: string) =>
      normalizeActionResult(await api.post<unknown>(`/cleanup/${id}/dry-run`)),
  });
}

export function useExecuteCleanup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ActionResult>(`/cleanup/${id}/execute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cleanup });
      queryClient.invalidateQueries({ queryKey: qk.resources() });
    },
  });
}

export function useIgnoreCleanup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<unknown>(`/cleanup/${id}/ignore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cleanup });
    },
  });
}

// --- Cost -------------------------------------------------------------------

export function useCostSummary() {
  return useQuery({
    queryKey: qk.cost("summary"),
    queryFn: async () =>
      normalizeCostSummary(await api.get<unknown>("/cost/summary")),
  });
}

export function useCostTrend() {
  return useQuery({
    queryKey: qk.cost("trend"),
    queryFn: async () =>
      asArray<unknown>(await api.get<unknown>("/cost/trend")).map(
        normalizeTrendPoint,
      ),
  });
}

export function useCostByProvider() {
  return useQuery({
    queryKey: qk.cost("by-provider"),
    queryFn: async () =>
      asArray<unknown>(await api.get<unknown>("/cost/by-provider")).map(
        normalizeProviderCost,
      ),
  });
}

export function useCostByService() {
  return useQuery({
    queryKey: qk.cost("by-service"),
    queryFn: async () =>
      asArray<unknown>(await api.get<unknown>("/cost/by-service")).map(
        normalizeServiceCost,
      ),
  });
}

export function useCostByRegion() {
  return useQuery({
    queryKey: qk.cost("by-region"),
    queryFn: async () =>
      asArray<unknown>(await api.get<unknown>("/cost/by-region")).map(
        normalizeRegionCost,
      ),
  });
}

export function useSavingsOpportunities() {
  return useQuery({
    queryKey: qk.cost("savings-opportunities"),
    queryFn: async () =>
      asArray<SavingsOpportunity>(
        await api.get<unknown>("/cost/savings-opportunities"),
      ),
  });
}

// --- Idle -------------------------------------------------------------------

export function useIdleResources() {
  return useQuery({
    queryKey: qk.idle,
    queryFn: async () =>
      asArray<unknown>(await api.get<unknown>("/idle")).map(normalizeIdle),
  });
}

export function useAnalyzeIdle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<unknown>("/idle/analyze"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.idle });
    },
  });
}

// --- Tag compliance ---------------------------------------------------------

export function useTagCompliance() {
  return useQuery({
    queryKey: qk.tags,
    queryFn: () => api.get<TagComplianceSummary>("/tags/compliance"),
  });
}

export function useAnalyzeTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<unknown>("/tags/analyze"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tags });
    },
  });
}

// --- Rightsizing ------------------------------------------------------------

export function useRightsizing() {
  return useQuery({
    queryKey: qk.rightsizing,
    queryFn: async () =>
      asArray<unknown>(await api.get<unknown>("/rightsizing")).map(
        normalizeRightsizing,
      ),
  });
}

export function useAnalyzeRightsizing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<unknown>("/rightsizing/analyze"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.rightsizing });
    },
  });
}

// --- Alerts / settings ------------------------------------------------------

export function useAlertSettings() {
  return useQuery({
    queryKey: qk.alertSettings,
    queryFn: () => api.get<AlertSettings>("/settings/alerts"),
  });
}

export function useUpdateAlertSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AlertSettings) =>
      api.put<AlertSettings>("/settings/alerts", body),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.alertSettings, data);
      queryClient.invalidateQueries({ queryKey: qk.alertSettings });
    },
  });
}

export function useTestSlack() {
  return useMutation({
    mutationFn: (webhookUrl?: string) =>
      api.post<AlertTestResult>("/alerts/test-slack", { webhookUrl }),
  });
}

export function useTestEmail() {
  return useMutation({
    mutationFn: (recipient?: string) =>
      api.post<AlertTestResult>("/alerts/test-email", { recipient }),
  });
}

// --- Logs -------------------------------------------------------------------

export function useActionLogs() {
  return useQuery({
    queryKey: qk.logs("actions"),
    queryFn: async () =>
      asArray<ActionLog>(await api.get<unknown>("/logs/actions")),
  });
}

export function useSyncLogs() {
  return useQuery({
    queryKey: qk.logs("sync"),
    queryFn: async () =>
      asArray<SyncJob>(await api.get<unknown>("/logs/sync")),
  });
}

export function useAlertLogs() {
  return useQuery({
    queryKey: qk.logs("alerts"),
    queryFn: async () =>
      asArray<AlertLog>(await api.get<unknown>("/logs/alerts")),
  });
}

export type { UseQueryOptions };
