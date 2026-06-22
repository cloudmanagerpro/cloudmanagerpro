"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api";
import { qk } from "../hooks";
import type {
  ActionExecutionResult,
  ActionKind,
  BulkActionItemResult,
  ProviderMode,
  RecommendationType,
  ResourceAction,
} from "../types";

// --- normalization helpers --------------------------------------------------
// The backend is being built in parallel, so every reader here tolerates
// missing/renamed fields and array-or-object shapes.

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

function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function strArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string");
  return out.length ? out : undefined;
}

function normalizeProviderMode(o: Record<string, unknown>): ProviderMode | undefined {
  const explicit = str(o.providerMode) ?? str(o.mode);
  if (explicit) return explicit.toUpperCase();
  // Some early backends only send a boolean `simulated`.
  if (bool(o.simulated) === true) return "SIMULATED";
  if (bool(o.simulated) === false) return "REAL";
  return undefined;
}

function normalizeBulkItem(input: unknown): BulkActionItemResult {
  const o = rec(input);
  return {
    resourceId: str(o.resourceId) ?? str(o.id),
    resourceName: str(o.resourceName) ?? str(o.name),
    success: bool(o.success),
    executed: bool(o.executed),
    message: str(o.message) ?? str(o.summary),
    providerMode: normalizeProviderMode(o),
  };
}

export function normalizeActionResult(input: unknown): ActionExecutionResult {
  const o = rec(input);
  const providerMode = normalizeProviderMode(o);
  const items = Array.isArray(o.results)
    ? (o.results as unknown[]).map(normalizeBulkItem)
    : Array.isArray(o.items)
      ? (o.items as unknown[]).map(normalizeBulkItem)
      : undefined;
  return {
    action: str(o.action),
    success: bool(o.success),
    executed: bool(o.executed),
    dryRun: bool(o.dryRun) ?? bool(o.dry_run),
    simulated: bool(o.simulated) ?? (providerMode === "SIMULATED" || undefined),
    providerMode,
    status: str(o.status),
    message: str(o.message) ?? str(o.summary),
    summary: str(o.summary) ?? str(o.message),
    steps: strArray(o.steps),
    estimatedMonthlySavings:
      num(o.estimatedMonthlySavings) ?? num(o.monthlySavings),
    fromType: str(o.fromType) ?? str(o.currentType),
    toType: str(o.toType) ?? str(o.recommendedType) ?? str(o.targetType),
    results: items,
    succeeded: num(o.succeeded) ?? num(o.successCount),
    failed: num(o.failed) ?? num(o.failureCount),
  };
}

/** Normalize the GET /resources/{id}/actions payload into ResourceAction[]. */
export function normalizeResourceActions(input: unknown): ResourceAction[] {
  // Accept `{ actions: [...] }`, `{ allowed: [...] }` or a bare array.
  let raw: unknown = input;
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const o = input as Record<string, unknown>;
    raw = o.actions ?? o.allowed ?? o.allowedActions ?? o.data ?? [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): ResourceAction | null => {
      if (typeof entry === "string") {
        return { action: entry.toUpperCase() as ActionKind };
      }
      const o = rec(entry);
      const action = (str(o.action) ?? str(o.type) ?? str(o.name) ?? "").toUpperCase();
      if (!action) return null;
      return {
        action: action as ActionKind,
        label: str(o.label) ?? str(o.title),
        description: str(o.description),
        destructive: bool(o.destructive) ?? bool(o.dangerous),
        requiresConfirmation:
          bool(o.requiresConfirmation) ?? bool(o.confirm) ?? bool(o.confirmation),
        enabled: bool(o.enabled),
        params:
          o.params && typeof o.params === "object"
            ? (o.params as Record<string, unknown>)
            : undefined,
      };
    })
    .filter((a): a is ResourceAction => a !== null);
}

// --- query keys -------------------------------------------------------------

export const actionKeys = {
  resourceActions: (id: string) => ["resources", "actions", id] as const,
};

function recommendationKey(type: RecommendationType) {
  switch (type) {
    case "idle":
      return qk.idle;
    case "rightsizing":
      return qk.rightsizing;
    case "cleanup":
      return qk.cleanup;
    case "tag":
      return qk.tags;
    default:
      return undefined;
  }
}

/** Invalidate the resource list + detail (covers post-action re-sync). */
function invalidateResources(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["resources"] });
}

// --- resource actions -------------------------------------------------------

export function useResourceActions(resourceId: string | null | undefined) {
  return useQuery({
    queryKey: actionKeys.resourceActions(resourceId ?? ""),
    queryFn: async () =>
      normalizeResourceActions(
        await api.get<unknown>(`/resources/${resourceId}/actions`),
      ),
    enabled: Boolean(resourceId),
    staleTime: 30_000,
    retry: false,
  });
}

export interface ResourceActionVars {
  id: string;
  action: ActionKind;
  params?: Record<string, unknown>;
  confirmation?: string;
}

export function useResourceActionDryRun() {
  return useMutation({
    mutationFn: async ({ id, action, params }: ResourceActionVars) =>
      normalizeActionResult(
        await api.post<unknown>(`/resources/${id}/actions/dry-run`, {
          action,
          params,
        }),
      ),
  });
}

export function useResourceActionExecute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, params, confirmation }: ResourceActionVars) =>
      normalizeActionResult(
        await api.post<unknown>(`/resources/${id}/actions/execute`, {
          action,
          params,
          confirmation,
        }),
      ),
    onSuccess: () => invalidateResources(queryClient),
  });
}

// --- bulk actions -----------------------------------------------------------

export interface BulkActionVars {
  resourceIds: string[];
  action: ActionKind;
  params?: Record<string, unknown>;
  confirmation?: string;
}

export function useBulkActionDryRun() {
  return useMutation({
    mutationFn: async ({ resourceIds, action, params }: BulkActionVars) =>
      normalizeActionResult(
        await api.post<unknown>(`/actions/bulk/dry-run`, {
          resourceIds,
          action,
          params,
        }),
      ),
  });
}

export function useBulkActionExecute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      resourceIds,
      action,
      params,
      confirmation,
    }: BulkActionVars) =>
      normalizeActionResult(
        await api.post<unknown>(`/actions/bulk/execute`, {
          resourceIds,
          action,
          params,
          confirmation,
        }),
      ),
    onSuccess: () => invalidateResources(queryClient),
  });
}

// --- recommendation apply ---------------------------------------------------

export interface ApplyRightsizingVars {
  id: string;
  /** Defaults to the recommended type server-side when omitted. */
  instanceType?: string;
  confirmation?: string;
}

export function useApplyRightsizing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, instanceType, confirmation }: ApplyRightsizingVars) =>
      normalizeActionResult(
        await api.post<unknown>(`/rightsizing/${id}/apply`, {
          instanceType,
          confirmation,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.rightsizing });
      invalidateResources(queryClient);
    },
  });
}

export interface ApplyIdleVars {
  id: string;
  confirmation?: string;
}

export function useApplyIdle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, confirmation }: ApplyIdleVars) =>
      normalizeActionResult(
        await api.post<unknown>(`/idle/${id}/apply`, { confirmation }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.idle });
      invalidateResources(queryClient);
    },
  });
}

// --- snooze / dismiss -------------------------------------------------------

export interface SnoozeVars {
  type: RecommendationType;
  id: string;
  /** Number of days to snooze (presets). */
  days?: number;
  /** Explicit resume timestamp (ISO) for custom snoozes. */
  until?: string;
}

export function useSnoozeRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    // Send both `days` and `until` so the backend can use whichever it models.
    mutationFn: ({ type, id, days, until }: SnoozeVars) =>
      api.post<unknown>(`/recommendations/${type}/${id}/snooze`, {
        days,
        until,
      }),
    onSuccess: (_data, { type }) => {
      const key = recommendationKey(type);
      if (key) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export interface DismissVars {
  type: RecommendationType;
  id: string;
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: DismissVars) =>
      api.post<unknown>(`/recommendations/${type}/${id}/dismiss`),
    onSuccess: (_data, { type }) => {
      const key = recommendationKey(type);
      if (key) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
