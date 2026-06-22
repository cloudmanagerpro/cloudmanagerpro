// =============================================================================
// Shared API types for CloudManagerPro frontend.
//
// These mirror the backend DTO contract (the backend is being built in
// parallel). Many fields are intentionally optional so the UI degrades
// gracefully if the backend omits or renames a field during integration.
// =============================================================================

export type Provider = "AWS" | "AZURE" | "GCP";

export type Role = "USER" | "ADMIN" | (string & {});

export type ResourceStatus =
  | "RUNNING"
  | "STOPPED"
  | "AVAILABLE"
  | "IN_USE"
  | "PENDING"
  | "TERMINATED"
  | "DELETING"
  | "ERROR"
  | "UNKNOWN"
  | (string & {});

export type WasteState =
  | "NONE"
  | "IDLE"
  | "UNDERUTILIZED"
  | "OVERSIZED"
  | "ORPHANED"
  | "UNATTACHED"
  | "DELETABLE"
  | (string & {});

export type Severity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
  | "INFO"
  | (string & {});

export type SyncStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "PARTIAL"
  | "FAILED"
  | (string & {});

export type CloudAccountStatus =
  | "CONNECTED"
  | "PENDING"
  | "ERROR"
  | "DISABLED"
  | "SYNCING"
  | (string & {});

// --- Auth -------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

// --- Cloud accounts ---------------------------------------------------------

export interface CloudAccount {
  id: string;
  name: string;
  provider: Provider;
  accountIdentifier?: string | null;
  region?: string | null;
  status: CloudAccountStatus;
  enabled?: boolean;
  lastSyncedAt?: string | null;
  resourceCount?: number;
  monthlyCost?: number;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // masked credential hints only — secrets never returned by the backend
  roleArn?: string | null;
  maskedAccessKey?: string | null;
}

export interface CreateCloudAccountRequest {
  name: string;
  provider: Provider;
  region?: string;
  // AWS
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
  externalId?: string;
  // Azure
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  subscriptionId?: string;
  // GCP
  projectId?: string;
  serviceAccountJson?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
}

// --- Resources --------------------------------------------------------------

export interface CloudResource {
  id: string;
  externalId?: string;
  name: string;
  provider: Provider;
  resourceType: string;
  service?: string;
  region?: string;
  status: ResourceStatus;
  wasteState?: WasteState;
  monthlyCost?: number;
  cloudAccountId?: string;
  cloudAccountName?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  firstSeenAt?: string;
  lastSeenAt?: string;
  createdAt?: string;
}

export interface ResourceFilters {
  provider?: Provider;
  resourceType?: string;
  region?: string;
  status?: ResourceStatus;
  wasteState?: WasteState;
  search?: string;
  tag?: string;
  minCost?: number;
  maxCost?: number;
}

// --- Sync -------------------------------------------------------------------

export interface SyncJob {
  id: string;
  cloudAccountId?: string;
  cloudAccountName?: string;
  provider?: Provider;
  status: SyncStatus;
  startedAt?: string;
  finishedAt?: string | null;
  resourcesDiscovered?: number;
  resourcesCreated?: number;
  resourcesUpdated?: number;
  resourcesRemoved?: number;
  durationMs?: number;
  errorMessage?: string | null;
}

// --- Cleanup ----------------------------------------------------------------

export interface CleanupCandidate {
  id: string;
  resourceId?: string;
  resourceName: string;
  provider: Provider;
  resourceType: string;
  region?: string;
  reason?: string;
  wasteState?: WasteState;
  severity?: Severity;
  recommendedAction?: string;
  estimatedMonthlySavings?: number;
  confidence?: number;
  status?: string;
  createdAt?: string;
}

export interface DryRunResult {
  candidateId?: string;
  wouldSucceed?: boolean;
  summary?: string;
  steps?: string[];
  estimatedMonthlySavings?: number;
  message?: string;
}

/** Result of a cleanup dry-run/execute/ignore action (backend ActionResultDto). */
export interface ActionResult {
  success: boolean;
  executed: boolean;
  dryRun: boolean;
  status?: string;
  message?: string;
}

// --- Resource actions -------------------------------------------------------
// Unified action framework consumed by the Resources drawer, bulk bar and the
// Optimize hub. Field names mirror the backend contract; everything optional so
// the UI degrades gracefully while the backend is built in parallel.

export type ActionKind =
  | "START"
  | "STOP"
  | "RESTART"
  | "TERMINATE"
  | "RESIZE"
  | "ADD_TAGS"
  | "REMOVE_TAGS"
  | "DELETE_VOLUME"
  | "RELEASE_EIP"
  | "DELETE_SNAPSHOT"
  | (string & {});

/** Whether the action ran for real or was simulated by the provider stub. */
export type ProviderMode = "REAL" | "SIMULATED" | (string & {});

/** A single action the backend reports as allowed for a resource. */
export interface ResourceAction {
  action: ActionKind;
  label?: string;
  description?: string;
  /** Destructive actions require a typed confirmation before executing. */
  destructive?: boolean;
  requiresConfirmation?: boolean;
  enabled?: boolean;
  /** Optional pre-filled params (e.g. recommended instance type for RESIZE). */
  params?: Record<string, unknown>;
}

/** Request body for the resource action dry-run / execute endpoints. */
export interface ActionRequest {
  action: ActionKind;
  params?: Record<string, unknown>;
  confirmation?: string;
}

/** Request body for the bulk action dry-run / execute endpoints. */
export interface BulkActionRequest {
  resourceIds: string[];
  action: ActionKind;
  params?: Record<string, unknown>;
  confirmation?: string;
}

/** Per-resource outcome inside a bulk action response. */
export interface BulkActionItemResult {
  resourceId?: string;
  resourceName?: string;
  success?: boolean;
  executed?: boolean;
  message?: string;
  providerMode?: ProviderMode;
}

/** Unified result of a dry-run or execute (resource or bulk). */
export interface ActionExecutionResult {
  action?: string;
  success?: boolean;
  executed?: boolean;
  dryRun?: boolean;
  simulated?: boolean;
  providerMode?: ProviderMode;
  status?: string;
  message?: string;
  summary?: string;
  steps?: string[];
  estimatedMonthlySavings?: number;
  /** RESIZE previews surface the type transition. */
  fromType?: string;
  toType?: string;
  /** Bulk endpoints may return a per-resource breakdown + counts. */
  results?: BulkActionItemResult[];
  succeeded?: number;
  failed?: number;
}

/** Recommendation families that support snooze/dismiss. */
export type RecommendationType =
  | "idle"
  | "rightsizing"
  | "cleanup"
  | "tag"
  | (string & {});

// --- Idle -------------------------------------------------------------------

export interface IdleResource {
  id: string;
  resourceId?: string;
  resourceName: string;
  provider: Provider;
  resourceType: string;
  region?: string;
  metric?: string;
  avgUtilization?: number;
  maxUtilization?: number;
  observationDays?: number;
  estimatedMonthlySavings?: number;
  recommendation?: string;
  severity?: Severity;
}

// --- Tag compliance ---------------------------------------------------------

export interface TagComplianceResult {
  id: string;
  resourceId?: string;
  resourceName: string;
  provider: Provider;
  resourceType: string;
  region?: string;
  compliant: boolean;
  missingTags?: string[];
  presentTags?: string[];
  score?: number;
  severity?: Severity;
}

export interface TagComplianceSummary {
  totalResources?: number;
  compliantResources?: number;
  nonCompliantResources?: number;
  complianceScore?: number;
  requiredTags?: string[];
  results?: TagComplianceResult[];
}

// --- Rightsizing ------------------------------------------------------------

export interface RightsizingRecommendation {
  id: string;
  resourceId?: string;
  resourceName: string;
  provider: Provider;
  resourceType: string;
  region?: string;
  currentType?: string;
  recommendedType?: string;
  currentMonthlyCost?: number;
  projectedMonthlyCost?: number;
  estimatedMonthlySavings?: number;
  savingsPercent?: number;
  cpuUtilization?: number;
  memoryUtilization?: number;
  // Backend serializes a Confidence enum (LOW/MEDIUM/HIGH), not a 0-100 number.
  confidence?: "LOW" | "MEDIUM" | "HIGH" | (string & {});
  severity?: Severity;
}

// --- Cost -------------------------------------------------------------------

export interface CostSummary {
  currentMonthCost?: number;
  lastMonthCost?: number;
  forecastCost?: number;
  dailyAverage?: number;
  changePercent?: number;
  potentialMonthlySavings?: number;
  currency?: string;
}

export interface CostTrendPoint {
  date: string;
  cost: number;
  forecast?: number;
}

export interface CostByProvider {
  provider: Provider;
  cost: number;
  percent?: number;
}

export interface CostByService {
  service: string;
  provider?: Provider;
  cost: number;
}

export interface CostByRegion {
  region: string;
  cost: number;
}

export interface SavingsOpportunity {
  id?: string;
  category: string;
  description?: string;
  estimatedMonthlySavings: number;
  count?: number;
  severity?: Severity;
}

// --- Alerts / settings ------------------------------------------------------

export interface AlertSettings {
  emailEnabled: boolean;
  emailRecipients?: string;
  slackEnabled: boolean;
  slackWebhookUrl?: string;
  costThreshold?: number;
  costSpikePercent?: number;
  notifyOnSyncFailure?: boolean;
  notifyOnNewWaste?: boolean;
  notifyOnIdle?: boolean;
  digestFrequency?: string;
  minSeverity?: Severity;
}

export interface AlertTestResult {
  success: boolean;
  message?: string;
}

// --- Logs -------------------------------------------------------------------

export interface ActionLog {
  id: string;
  actionType?: string;
  action?: string;
  resourceId?: string;
  resourceName?: string;
  provider?: Provider;
  status?: string;
  dryRun?: boolean;
  message?: string;
  userEmail?: string;
  createdAt: string;
}

export interface AlertLog {
  id: string;
  alertType?: string;
  channel?: string;
  severity?: Severity;
  subject?: string;
  message?: string;
  status?: string;
  createdAt: string;
}
