"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell,
  Laptop,
  MoonStar,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_GROUPS } from "@/lib/constants";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext =
  React.createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider",
    );
  }
  return ctx;
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = React.useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  const go = React.useCallback(
    (href: string) => run(() => router.push(href)),
    [router, run],
  );

  const value = React.useMemo<CommandPaletteContextValue>(
    () => ({ open, setOpen, toggle: () => setOpen((p) => !p) }),
    [open],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick actions">
            <CommandItem
              value="add cloud account connect aws azure gcp"
              onSelect={() => go("/dashboard/cloud-accounts?new=1")}
            >
              <Plus />
              Add cloud account
            </CommandItem>
            <CommandItem
              value="sync resources accounts"
              onSelect={() => go("/dashboard/cloud-accounts")}
            >
              <RefreshCw />
              Sync resources
            </CommandItem>
            <CommandItem
              value="run optimization scan analyze savings"
              onSelect={() => go("/dashboard/optimize")}
            >
              <Sparkles />
              Run optimization scan
            </CommandItem>
            <CommandItem
              value="view cleanup candidates waste orphaned"
              onSelect={() => go("/dashboard/optimize?tab=cleanup")}
            >
              <Trash2 />
              View cleanup candidates
            </CommandItem>
            <CommandItem
              value="bulk stop idle resources utilization"
              onSelect={() => go("/dashboard/resources?wasteState=IDLE")}
            >
              <MoonStar />
              Bulk stop idle resources
            </CommandItem>
            <CommandItem
              value="view cost explorer spend"
              onSelect={() => go("/dashboard/cost-explorer")}
            >
              <Wallet />
              View cost explorer
            </CommandItem>
            <CommandItem
              value="view alerts notifications"
              onSelect={() => go("/dashboard/alerts")}
            >
              <Bell />
              View alerts
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {NAV_GROUPS.map((group, index) => (
            <CommandGroup
              key={group.label ?? `nav-${index}`}
              heading={group.label ?? "Navigation"}
            >
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.description}`}
                  onSelect={() => go(item.href)}
                >
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          <CommandSeparator />

          <CommandGroup heading="Theme">
            <CommandItem value="light theme" onSelect={() => run(() => setTheme("light"))}>
              <Sun />
              Light
            </CommandItem>
            <CommandItem value="dark theme" onSelect={() => run(() => setTheme("dark"))}>
              <MoonStar />
              Dark
            </CommandItem>
            <CommandItem
              value="system theme"
              onSelect={() => run(() => setTheme("system"))}
            >
              <Laptop />
              System
              <CommandShortcut>auto</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}
