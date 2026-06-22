"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ExternalLink,
  Laptop,
  LogOut,
  MoonStar,
  Settings,
  Sun,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { clearAuth } from "@/lib/auth";
import { GITHUB_URL } from "@/lib/constants";
import { useMe } from "@/lib/hooks";
import { cn, formatDate } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "system", label: "System", icon: Laptop },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { data: user, isLoading } = useMe();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const handleSignOut = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your workspace and account preferences."
        icon={Settings}
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your CloudManagerPro account details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
              <div className="flex gap-8">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                    id="profile-name"
                    value={user?.name ?? ""}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    value={user?.email ?? ""}
                    disabled
                    readOnly
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <div>
                    <Badge variant="muted" className="capitalize">
                      {user?.role?.toLowerCase() ?? "user"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Member since</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(user?.createdAt)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Profile editing is coming soon.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how CloudManagerPro looks on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = mounted && theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
                    active
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>
            Where your cloud accounts and data live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Default workspace</p>
              <p className="text-sm text-muted-foreground">Personal</p>
            </div>
            <Badge variant="muted">Personal</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-workspace support is on the roadmap.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Build and project information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            <InfoRow label="App">CloudManagerPro</InfoRow>
            <InfoRow label="Version">0.1.0</InfoRow>
            <InfoRow label="License">Apache-2.0</InfoRow>
            <InfoRow label="Mode">
              <Badge variant="muted">Demo</Badge>
            </InfoRow>
            <InfoRow label="Source">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </InfoRow>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Demo mode is enabled by default, so you can explore CloudManagerPro
            with realistic sample data.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out of CloudManagerPro on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}
