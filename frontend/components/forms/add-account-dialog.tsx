"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useCreateCloudAccount } from "@/lib/hooks";
import type { CreateCloudAccountRequest, Provider } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Give this account a name"),
  region: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  roleArn: z.string().optional(),
  externalId: z.string().optional(),
  tenantId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  subscriptionId: z.string().optional(),
  projectId: z.string().optional(),
  serviceAccountJson: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const PROVIDER_TABS: { value: Provider; label: string }[] = [
  { value: "AWS", label: "AWS" },
  { value: "AZURE", label: "Azure" },
  { value: "GCP", label: "GCP" },
];

const REGION_PLACEHOLDER: Record<Provider, string> = {
  AWS: "us-east-1",
  AZURE: "eastus",
  GCP: "us-central1",
};

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AddAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [provider, setProvider] = React.useState<Provider>("AWS");
  const createAccount = useCreateCloudAccount();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  React.useEffect(() => {
    if (!open) {
      reset();
      setProvider("AWS");
    }
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    const payload: CreateCloudAccountRequest = { ...values, provider };
    createAccount.mutate(payload, {
      onSuccess: () => {
        toast.success("Cloud account added", {
          description: "Run a sync to start discovering resources.",
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Couldn't add the account. Please try again.",
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add cloud account</DialogTitle>
          <DialogDescription>
            Connect a provider to discover resources. Leave credentials blank to
            explore with demo data.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={provider}
          onValueChange={(v) => setProvider(v as Provider)}
        >
          <TabsList className="grid w-full grid-cols-3">
            {PROVIDER_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field id="name" label="Account name">
            <Input
              id="name"
              placeholder="Production"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </Field>

          <Field id="region" label="Default region">
            <Input
              id="region"
              placeholder={REGION_PLACEHOLDER[provider]}
              {...register("region")}
            />
          </Field>

          {provider === "AWS" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="accessKeyId" label="Access key ID">
                <Input id="accessKeyId" placeholder="AKIA…" {...register("accessKeyId")} />
              </Field>
              <Field id="secretAccessKey" label="Secret access key">
                <Input
                  id="secretAccessKey"
                  type="password"
                  placeholder="••••••••"
                  {...register("secretAccessKey")}
                />
              </Field>
              <Field id="roleArn" label="Role ARN" hint="Optional — for AssumeRole">
                <Input
                  id="roleArn"
                  placeholder="arn:aws:iam::123456789012:role/CloudManager"
                  {...register("roleArn")}
                />
              </Field>
              <Field id="externalId" label="External ID" hint="Optional">
                <Input id="externalId" placeholder="external-id" {...register("externalId")} />
              </Field>
            </div>
          ) : null}

          {provider === "AZURE" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="tenantId" label="Tenant ID">
                <Input id="tenantId" placeholder="00000000-0000-…" {...register("tenantId")} />
              </Field>
              <Field id="subscriptionId" label="Subscription ID">
                <Input
                  id="subscriptionId"
                  placeholder="00000000-0000-…"
                  {...register("subscriptionId")}
                />
              </Field>
              <Field id="clientId" label="Client ID">
                <Input id="clientId" placeholder="app id" {...register("clientId")} />
              </Field>
              <Field id="clientSecret" label="Client secret">
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="••••••••"
                  {...register("clientSecret")}
                />
              </Field>
            </div>
          ) : null}

          {provider === "GCP" ? (
            <div className="space-y-4">
              <Field id="projectId" label="Project ID">
                <Input id="projectId" placeholder="my-gcp-project" {...register("projectId")} />
              </Field>
              <Field
                id="serviceAccountJson"
                label="Service account key (JSON)"
                hint="Optional — paste the JSON key contents"
              >
                <Textarea
                  id="serviceAccountJson"
                  rows={4}
                  placeholder='{ "type": "service_account", … }'
                  className="font-mono text-xs"
                  {...register("serviceAccountJson")}
                />
              </Field>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={createAccount.isPending}>
              {createAccount.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
