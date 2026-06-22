"use client";

import * as React from "react";
import {
  Ban,
  Clock,
  Loader2,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { actionError } from "@/components/actions/action-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDismissRecommendation,
  useSnoozeRecommendation,
} from "@/lib/hooks/actions";
import type { RecommendationType } from "@/lib/types";

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function RecommendationMenu({
  type,
  id,
  onApply,
  applyLabel = "Apply",
  applyIcon: ApplyIcon,
  leading,
  disabled,
  busy,
}: {
  type: RecommendationType;
  id: string;
  onApply?: () => void;
  applyLabel?: string;
  applyIcon?: LucideIcon;
  leading?: React.ReactNode;
  disabled?: boolean;
  busy?: boolean;
}) {
  const snooze = useSnoozeRecommendation();
  const dismiss = useDismissRecommendation();
  const [customOpen, setCustomOpen] = React.useState(false);
  const [customDate, setCustomDate] = React.useState("");

  const pending = busy || snooze.isPending || dismiss.isPending;

  const doSnooze = (days: number, until?: string) =>
    snooze.mutate(
      { type, id, days, until: until ?? addDaysISO(days) },
      {
        onSuccess: () =>
          toast.success(
            until
              ? "Snoozed until the selected date"
              : `Snoozed for ${days} days`,
          ),
        onError: (err) => toast.error(actionError(err, "Couldn't snooze")),
      },
    );

  const doDismiss = () =>
    dismiss.mutate(
      { type, id },
      {
        onSuccess: () => toast.success("Dismissed"),
        onError: (err) => toast.error(actionError(err, "Couldn't dismiss")),
      },
    );

  const confirmCustom = () => {
    if (!customDate) return;
    const until = new Date(`${customDate}T12:00:00`).toISOString();
    const days = Math.max(
      1,
      Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000),
    );
    doSnooze(days, until);
    setCustomOpen(false);
    setCustomDate("");
  };

  return (
    <>
      <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Actions"
              disabled={disabled || pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {leading}
            {leading ? <DropdownMenuSeparator /> : null}
            {onApply ? (
              <DropdownMenuItem onSelect={() => onApply()}>
                {ApplyIcon ? <ApplyIcon className="h-4 w-4" /> : null}
                {applyLabel}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => doSnooze(7)}>
              <Clock className="h-4 w-4" />
              Snooze 7 days
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => doSnooze(30)}>
              <Clock className="h-4 w-4" />
              Snooze 30 days
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCustomOpen(true)}>
              <Clock className="h-4 w-4" />
              Snooze until…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => doDismiss()}
            >
              <Ban className="h-4 w-4" />
              Dismiss
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Snooze until…</DialogTitle>
            <DialogDescription>
              Hide this recommendation until the selected date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="snooze-date">Resume on</Label>
            <Input
              id="snooze-date"
              type="date"
              value={customDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCustom} disabled={!customDate}>
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
