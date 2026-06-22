"use client";

import * as React from "react";
import { Bell, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { SEVERITIES } from "@/lib/constants";
import {
  useAlertSettings,
  useTestEmail,
  useTestSlack,
  useUpdateAlertSettings,
} from "@/lib/hooks";
import type { AlertSettings } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const DEFAULT_SETTINGS: AlertSettings = {
  emailEnabled: false,
  emailRecipients: "",
  slackEnabled: false,
  slackWebhookUrl: "",
  costThreshold: undefined,
  costSpikePercent: undefined,
  notifyOnSyncFailure: true,
  notifyOnNewWaste: true,
  notifyOnIdle: false,
  digestFrequency: "DAILY",
  minSeverity: "MEDIUM",
};

export default function AlertsPage() {
  const { data, isLoading } = useAlertSettings();
  const update = useUpdateAlertSettings();
  const testEmail = useTestEmail();
  const testSlack = useTestSlack();

  const [form, setForm] = React.useState<AlertSettings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    if (data) setForm({ ...DEFAULT_SETTINGS, ...data });
  }, [data]);

  const handleTestEmail = () => {
    testEmail.mutate(form.emailRecipients?.split(",")[0]?.trim(), {
      onSuccess: (result) => {
        if (result?.success === false) {
          toast.error(result.message ?? "Couldn't send test email");
        } else {
          toast.success(result?.message ?? "Test email sent");
        }
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't send test email",
        ),
    });
  };

  const handleTestSlack = () => {
    testSlack.mutate(form.slackWebhookUrl, {
      onSuccess: (result) => {
        if (result?.success === false) {
          toast.error(result.message ?? "Couldn't send Slack message");
        } else {
          toast.success(result?.message ?? "Test Slack message sent");
        }
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't send Slack message",
        ),
    });
  };

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => toast.success("Alert settings saved"),
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't save settings",
        ),
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Alerts"
        description="Choose how CloudManagerPro notifies you over Slack and email."
        icon={Bell}
      />

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-40" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Email notifications</CardTitle>
              <CardDescription>
                Send alert digests and one-off notifications to your inbox.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                label="Email alerts"
                description="Turn email notifications on or off."
                checked={form.emailEnabled}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, emailEnabled: checked }))
                }
              />
              <div className="space-y-1.5">
                <Label htmlFor="emailRecipients">Recipients</Label>
                <Input
                  id="emailRecipients"
                  placeholder="alerts@company.com, you@company.com"
                  value={form.emailRecipients ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, emailRecipients: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of email addresses.
                </p>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testEmail.isPending}
                >
                  {testEmail.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send test email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Slack notifications</CardTitle>
              <CardDescription>
                Post alerts to a Slack channel via an incoming webhook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                label="Slack alerts"
                description="Turn Slack notifications on or off."
                checked={form.slackEnabled}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, slackEnabled: checked }))
                }
              />
              <div className="space-y-1.5">
                <Label htmlFor="slackWebhookUrl">Webhook URL</Label>
                <Input
                  id="slackWebhookUrl"
                  placeholder="https://hooks.slack.com/services/…"
                  value={form.slackWebhookUrl ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slackWebhookUrl: e.target.value }))
                  }
                />
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={handleTestSlack}
                  disabled={testSlack.isPending}
                >
                  {testSlack.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send test Slack
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thresholds</CardTitle>
              <CardDescription>
                Get alerted when spend crosses the limits you set.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="costThreshold">
                    Monthly cost threshold ($)
                  </Label>
                  <Input
                    id="costThreshold"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    placeholder="5000"
                    value={form.costThreshold ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        costThreshold:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="costSpikePercent">Cost spike alert (%)</Label>
                  <Input
                    id="costSpikePercent"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    placeholder="25"
                    value={form.costSpikePercent ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        costSpikePercent:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notify me about</CardTitle>
              <CardDescription>
                Pick the events worth interrupting your day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                label="Sync failures"
                description="A cloud account fails to sync."
                checked={form.notifyOnSyncFailure ?? false}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, notifyOnSyncFailure: checked }))
                }
              />
              <ToggleRow
                label="New waste detected"
                description="New cleanup opportunities are found."
                checked={form.notifyOnNewWaste ?? false}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, notifyOnNewWaste: checked }))
                }
              />
              <ToggleRow
                label="Idle resources"
                description="Resources fall below your utilization targets."
                checked={form.notifyOnIdle ?? false}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, notifyOnIdle: checked }))
                }
              />

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="minSeverity">Minimum severity</Label>
                  <Select
                    value={form.minSeverity ?? "MEDIUM"}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, minSeverity: value }))
                    }
                  >
                    <SelectTrigger id="minSeverity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {titleCase(severity)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="digestFrequency">Digest frequency</Label>
                  <Select
                    value={form.digestFrequency ?? "DAILY"}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, digestFrequency: value }))
                    }
                  >
                    <SelectTrigger id="digestFrequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
            <Button
              variant="gradient"
              onClick={handleSave}
              disabled={update.isPending}
            >
              {update.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 pr-2">
        <Label>{label}</Label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
