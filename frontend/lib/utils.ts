import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toDate(date?: string | number | Date | null): Date | null {
  if (date === undefined || date === null || date === "") return null;
  try {
    const d = typeof date === "string" ? parseISO(date) : new Date(date);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function formatCurrency(
  value?: number | null,
  options: { maximumFractionDigits?: number; compact?: boolean } = {},
): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "$0";
  const { maximumFractionDigits, compact } = options;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits:
      maximumFractionDigits ?? (compact ? 1 : value % 1 === 0 ? 0 : 2),
  }).format(value);
}

export function formatNumber(value?: number | null, compact = false): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value?: number | null, fractionDigits = 0): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "0%";
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatDate(date?: string | number | Date | null): string {
  const d = toDate(date);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date?: string | number | Date | null): string {
  const d = toDate(date);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date?: string | number | Date | null): string {
  const d = toDate(date);
  if (!d) return "Never";
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

/** Convert SCREAMING_SNAKE_CASE enums into readable labels, preserving acronyms. */
const ACRONYMS = new Set([
  "AWS",
  "GCP",
  "EC2",
  "EBS",
  "RDS",
  "S3",
  "IP",
  "ELB",
  "ALB",
  "NLB",
  "VM",
  "CPU",
  "ID",
  "URL",
  "API",
  "DB",
  "NAT",
  "VPC",
  "IAM",
]);

export function formatEnum(value?: string | null): string {
  if (!value) return "—";
  return value
    .toString()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function titleCase(value?: string | null): string {
  if (!value) return "";
  return value
    .toString()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function initials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(value: string, length = 40): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}

export function sum(values: Array<number | undefined | null>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
