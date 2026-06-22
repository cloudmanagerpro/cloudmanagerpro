import {
  Archive,
  Bell,
  Box,
  Boxes,
  Cloud,
  Database,
  HardDrive,
  LayoutDashboard,
  Network,
  Router,
  ScrollText,
  Server,
  Settings,
  Sparkles,
  Tags,
  Wallet,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type { Provider, Severity } from "./types";
import { formatEnum } from "./utils";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Spend, savings & activity at a glance",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        title: "Cloud Accounts",
        href: "/dashboard/cloud-accounts",
        icon: Cloud,
        description: "Linked AWS, Azure & GCP accounts",
      },
      {
        title: "Resources",
        href: "/dashboard/resources",
        icon: Boxes,
        description: "Explore every discovered resource",
      },
    ],
  },
  {
    label: "Optimize",
    items: [
      {
        title: "Optimize",
        href: "/dashboard/optimize",
        icon: Sparkles,
        description: "Cleanup, idle & rightsizing in one place",
      },
      {
        title: "Cost Explorer",
        href: "/dashboard/cost-explorer",
        icon: Wallet,
        description: "Break down spend across clouds",
      },
      {
        title: "Tag Compliance",
        href: "/dashboard/tag-compliance",
        icon: Tags,
        description: "Audit required tagging policies",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Alerts",
        href: "/dashboard/alerts",
        icon: Bell,
        description: "Slack & email alert settings",
      },
      {
        title: "Logs",
        href: "/dashboard/logs",
        icon: ScrollText,
        description: "Actions, sync & alert history",
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        description: "Workspace & account preferences",
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export const PROVIDERS: Provider[] = ["AWS", "AZURE", "GCP"];

export interface ProviderMeta {
  label: string;
  short: string;
  /** Tailwind classes for a subtle colored badge. */
  badgeClass: string;
  dotClass: string;
  /** Hex used for charts. */
  color: string;
}

// Monochrome provider styling — distinguished by label + grayscale shade, not
// hue. Chart colors are grayscale hexes aligned with the --chart ramp.
export const PROVIDER_META: Record<Provider, ProviderMeta> = {
  AWS: {
    label: "Amazon Web Services",
    short: "AWS",
    badgeClass: "border-border bg-muted text-foreground",
    dotClass: "bg-foreground",
    color: "#3f3f46",
  },
  AZURE: {
    label: "Microsoft Azure",
    short: "Azure",
    badgeClass: "border-border bg-muted text-foreground",
    dotClass: "bg-muted-foreground",
    color: "#71717a",
  },
  GCP: {
    label: "Google Cloud",
    short: "GCP",
    badgeClass: "border-border bg-muted text-foreground",
    dotClass: "bg-muted-foreground/60",
    color: "#a1a1aa",
  },
};

export function getProviderMeta(provider?: string): ProviderMeta {
  if (provider && provider in PROVIDER_META) {
    return PROVIDER_META[provider as Provider];
  }
  return {
    label: provider ?? "Unknown",
    short: provider ?? "—",
    badgeClass: "border-border bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
    color: "#a1a1aa",
  };
}

export const RESOURCE_STATUSES = [
  "RUNNING",
  "STOPPED",
  "AVAILABLE",
  "IN_USE",
  "PENDING",
  "TERMINATED",
  "ERROR",
] as const;

export const WASTE_STATES = [
  "NONE",
  "IDLE",
  "UNDERUTILIZED",
  "OVERSIZED",
  "ORPHANED",
  "UNATTACHED",
  "DELETABLE",
] as const;

export const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const DEFAULT_REQUIRED_TAGS = [
  "environment",
  "owner",
  "cost-center",
  "project",
];

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export const GITHUB_URL = "https://github.com/cloudmanagerpro/cloudmanagerpro";

// --- Service-type grouping --------------------------------------------------
// A single source of truth mapping a resource's `resourceType` (or `service`)
// onto a friendly {label, icon, category}. Used to group resources, cleanup /
// idle / rightsizing candidates and tag-compliance results into per-service
// boxes across the app. The map is intentionally open-ended: any type the
// backend introduces later (e.g. S3_BUCKET, RDS_INSTANCE, DYNAMODB_TABLE) is
// rendered automatically — known types get a curated label+icon, unknown ones
// fall back to a humanized label and a neutral icon so nothing is hard-coded
// to only EC2/EBS.

export type ServiceCategory =
  | "Compute"
  | "Database"
  | "Storage"
  | "Networking"
  | "Other";

export interface ServiceTypeMeta {
  /** Stable grouping key (the upper-cased resourceType, or OTHER). */
  key: string;
  /** Friendly plural label, e.g. "EC2 Instances". */
  label: string;
  /** Compact label for tiles/badges, e.g. "EC2". */
  short: string;
  icon: LucideIcon;
  /** Higher-level family used for stable ordering. */
  category: ServiceCategory;
  /** Sort weight so tiles/sections render in a sensible, stable order. */
  order: number;
}

export const UNKNOWN_SERVICE_KEY = "OTHER";

type ServiceTypeDef = Omit<ServiceTypeMeta, "key">;

// Curated definitions. Order groups by family (compute → database → storage →
// networking) then by familiarity within the family.
const SERVICE_TYPE_DEFS: Record<string, ServiceTypeDef> = {
  EC2_INSTANCE: { label: "EC2 Instances", short: "EC2", icon: Server, category: "Compute", order: 10 },
  VM: { label: "Virtual Machines", short: "VMs", icon: Server, category: "Compute", order: 11 },
  RDS_INSTANCE: { label: "RDS Databases", short: "RDS", icon: Database, category: "Database", order: 20 },
  S3_BUCKET: { label: "S3 Buckets", short: "S3", icon: Box, category: "Storage", order: 30 },
  EBS_VOLUME: { label: "EBS Volumes", short: "EBS", icon: HardDrive, category: "Storage", order: 31 },
  DISK: { label: "Managed Disks", short: "Disks", icon: HardDrive, category: "Storage", order: 32 },
  SNAPSHOT: { label: "Snapshots", short: "Snapshots", icon: Archive, category: "Storage", order: 33 },
  ELASTIC_IP: { label: "Elastic IPs", short: "EIP", icon: Network, category: "Networking", order: 40 },
  PUBLIC_IP: { label: "Public IPs", short: "Public IP", icon: Network, category: "Networking", order: 41 },
  LOAD_BALANCER: { label: "Load Balancers", short: "LB", icon: Waypoints, category: "Networking", order: 42 },
  NAT_GATEWAY: { label: "NAT Gateways", short: "NAT", icon: Router, category: "Networking", order: 43 },
};

/** Normalize any resourceType/service string into a stable grouping key. */
export function serviceKeyOf(resourceType?: string | null): string {
  const key = (resourceType ?? "").toString().trim().toUpperCase();
  return key || UNKNOWN_SERVICE_KEY;
}

/**
 * Resolve the friendly metadata for a resource type. Falls back gracefully for
 * unmapped values so brand-new backend types still render with a readable label
 * and a neutral icon (keeping grouping fully dynamic).
 */
export function getServiceMeta(resourceType?: string | null): ServiceTypeMeta {
  const key = serviceKeyOf(resourceType);
  const known = SERVICE_TYPE_DEFS[key];
  if (known) return { key, ...known };
  if (key === UNKNOWN_SERVICE_KEY) {
    return {
      key,
      label: "Other",
      short: "Other",
      icon: Boxes,
      category: "Other",
      order: 900,
    };
  }
  const label = formatEnum(resourceType);
  return {
    key,
    label,
    short: label,
    icon: Boxes,
    category: "Other",
    order: 901,
  };
}

export interface ServiceGroup<T> {
  key: string;
  meta: ServiceTypeMeta;
  items: T[];
}

/**
 * Group an arbitrary list by service type, returned in a stable, sensible order
 * (compute first, unknown/"Other" last). `getType` lets each caller point at
 * the relevant field (resourceType today, service tomorrow).
 */
export function groupByServiceType<T>(
  items: T[],
  getType: (item: T) => string | undefined | null,
): ServiceGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = serviceKeyOf(getType(item));
    const existing = buckets.get(key);
    if (existing) existing.push(item);
    else buckets.set(key, [item]);
  }
  return Array.from(buckets.entries())
    .map(([key, groupItems]) => ({
      key,
      meta: getServiceMeta(key),
      items: groupItems,
    }))
    .sort(
      (a, b) =>
        a.meta.order - b.meta.order || a.meta.label.localeCompare(b.meta.label),
    );
}
