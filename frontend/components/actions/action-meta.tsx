import {
  Play,
  Power,
  RotateCcw,
  Scaling,
  Tags,
  Trash2,
  Unplug,
  type LucideIcon,
} from "lucide-react";

import type { ActionKind, CloudResource, ResourceAction } from "@/lib/types";

export interface ActionMeta {
  label: string;
  /** Imperative verb used on confirm buttons, e.g. "Stop". */
  verb: string;
  icon: LucideIcon;
  destructive: boolean;
}

const CATALOG: Record<string, ActionMeta> = {
  START: { label: "Start", verb: "Start", icon: Play, destructive: false },
  STOP: { label: "Stop", verb: "Stop", icon: Power, destructive: false },
  RESTART: { label: "Restart", verb: "Restart", icon: RotateCcw, destructive: false },
  RESIZE: { label: "Resize", verb: "Resize", icon: Scaling, destructive: false },
  ADD_TAGS: { label: "Edit tags", verb: "Save tags", icon: Tags, destructive: false },
  REMOVE_TAGS: { label: "Remove tags", verb: "Remove tags", icon: Tags, destructive: false },
  TERMINATE: { label: "Terminate", verb: "Terminate", icon: Trash2, destructive: true },
  DELETE_VOLUME: { label: "Delete volume", verb: "Delete volume", icon: Trash2, destructive: true },
  DELETE_SNAPSHOT: { label: "Delete snapshot", verb: "Delete snapshot", icon: Trash2, destructive: true },
  RELEASE_EIP: { label: "Release IP", verb: "Release", icon: Unplug, destructive: true },
};

const FALLBACK: ActionMeta = {
  label: "Run action",
  verb: "Run",
  icon: Play,
  destructive: false,
};

export function getActionMeta(action: ActionKind | string): ActionMeta {
  return CATALOG[String(action).toUpperCase()] ?? FALLBACK;
}

/** Whether an action should require type-to-confirm (catalog or backend flag). */
export function isDestructive(action: ResourceAction): boolean {
  if (typeof action.destructive === "boolean") return action.destructive;
  return getActionMeta(action.action).destructive;
}

/** Human label for an action, preferring any backend-provided label. */
export function actionLabel(action: ResourceAction): string {
  return action.label ?? getActionMeta(action.action).label;
}

function up(v?: string): string {
  return (v ?? "").toUpperCase();
}

function matches(type: string, ...needles: string[]): boolean {
  return needles.some((n) => type.includes(n));
}

/**
 * Contextual fallback action list derived purely from the resource's type +
 * status, mirroring the plan's "Resource type / state → actions" table. Used
 * when the backend actions endpoint is unavailable or returns nothing.
 */
export function deriveResourceActions(resource: CloudResource): ResourceAction[] {
  const type = up(resource.resourceType) + " " + up(resource.service);
  const status = up(resource.status);
  const waste = up(resource.wasteState);

  const make = (...kinds: ActionKind[]): ResourceAction[] =>
    kinds.map((action) => ({ action }));

  // EC2 / virtual machine instances.
  if (matches(type, "EC2", "INSTANCE", "VM", "VIRTUAL_MACHINE", "COMPUTE")) {
    if (status === "RUNNING" || status === "IN_USE") {
      return make("STOP", "RESTART", "RESIZE", "ADD_TAGS", "TERMINATE");
    }
    if (status === "STOPPED") {
      return make("START", "RESIZE", "ADD_TAGS", "TERMINATE");
    }
    return make("ADD_TAGS", "TERMINATE");
  }

  // EBS / managed disks.
  if (matches(type, "EBS", "VOLUME", "DISK")) {
    if (status === "AVAILABLE" || waste === "UNATTACHED" || waste === "ORPHANED") {
      return make("DELETE_VOLUME", "ADD_TAGS");
    }
    return make("ADD_TAGS");
  }

  // Elastic IPs / static addresses.
  if (matches(type, "ELASTIC_IP", "EIP", "ADDRESS") || type.includes("IP")) {
    return make("RELEASE_EIP");
  }

  // Snapshots / images.
  if (matches(type, "SNAPSHOT", "IMAGE", "AMI")) {
    return make("DELETE_SNAPSHOT", "ADD_TAGS");
  }

  // Generic taggable fallback.
  return make("ADD_TAGS");
}

export const NON_AWS_TOOLTIP = "Simulated — connect AWS for real actions";
