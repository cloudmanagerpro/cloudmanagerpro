import { AlertTriangle, RefreshCw } from "lucide-react";

import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  title?: string;
}

export function ErrorState({
  error,
  onRetry,
  className,
  title = "Something went wrong",
}: ErrorStateProps) {
  const message =
    error instanceof ApiError
      ? error.status === 0
        ? "Can't reach the API. Is the backend running?"
        : error.message
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred while loading data.";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center",
        className,
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
