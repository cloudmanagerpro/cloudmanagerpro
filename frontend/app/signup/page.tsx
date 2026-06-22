"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { isAuthenticated, persistSession } from "@/lib/auth";
import { useSignup } from "@/lib/hooks";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Password is too long"),
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const password = watch("password");

  React.useEffect(() => {
    if (isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  const onSubmit = (values: FormValues) => {
    signup.mutate(values, {
      onSuccess: (data) => {
        persistSession(data.token, data.user);
        toast.success("Account created — welcome to CloudManagerPro");
        router.replace("/dashboard");
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Unable to create your account. Please try again.",
        );
      },
    });
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start optimizing your cloud spend in minutes"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pr-10"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check
                className={
                  password && password.length >= 8
                    ? "h-3 w-3 text-foreground"
                    : "h-3 w-3 text-muted-foreground/50"
                }
              />
              Minimum 8 characters
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          disabled={signup.isPending}
        >
          {signup.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        By signing up you agree to self-host responsibly. No data leaves your
        infrastructure.
      </p>
    </AuthShell>
  );
}
