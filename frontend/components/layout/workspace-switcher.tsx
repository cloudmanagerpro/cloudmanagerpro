"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          DW
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium leading-tight">
            Default workspace
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Personal
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuItem className="gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
            DW
          </span>
          <span className="flex-1">Default workspace</span>
          <Check className="h-4 w-4 text-primary" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
          <Plus className="h-4 w-4" />
          New workspace
          <span className="ml-auto text-[10px] uppercase tracking-wide">
            Soon
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
