"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Command, LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommandPalette } from "@/components/command/command-palette";
import { clearAuth } from "@/lib/auth";
import { useMe } from "@/lib/hooks";
import { initials } from "@/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const { data: user } = useMe();
  const { setOpen } = useCommandPalette();

  const signOut = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-offset-background transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user?.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials(user?.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user?.name ?? "Account"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
        {user?.role ? (
          <div className="px-2 pb-2">
            <Badge variant="muted" className="capitalize">
              {user.role.toLowerCase()}
            </Badge>
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setOpen(true)}>
          <Command className="h-4 w-4" />
          Command menu
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={signOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
