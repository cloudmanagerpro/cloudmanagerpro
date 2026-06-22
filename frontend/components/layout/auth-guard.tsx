"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getToken } from "@/lib/auth";
import { useMe } from "@/lib/hooks";
import { Logo } from "@/components/brand/logo";

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <Logo />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);
  const [hasToken, setHasToken] = React.useState(false);

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      setHasToken(false);
    } else {
      setHasToken(true);
    }
    setChecked(true);
  }, [router]);

  // Validate the session; the API layer clears the token and redirects on 401.
  useMe(hasToken);

  if (!checked) {
    return <FullScreenLoader label="Loading your workspace…" />;
  }

  if (!hasToken) {
    return <FullScreenLoader label="Redirecting to sign in…" />;
  }

  return <>{children}</>;
}
