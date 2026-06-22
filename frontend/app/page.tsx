import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Boxes,
  Check,
  Github,
  Layers,
  Lock,
  MoonStar,
  Scaling,
  Server,
  ShieldCheck,
  Sparkles,
  Tags,
  Terminal,
  Trash2,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GITHUB_URL } from "@/lib/constants";

const features = [
  {
    icon: Wallet,
    title: "Cost Explorer",
    description:
      "Break down spend by provider, service and region with trend lines and forecasts you can actually act on.",
  },
  {
    icon: Trash2,
    title: "Waste Cleanup",
    description:
      "Surface orphaned volumes, unattached IPs and idle instances with safe dry-run and one-click cleanup.",
  },
  {
    icon: MoonStar,
    title: "Idle Detection",
    description:
      "Continuous utilization analysis flags resources sitting idle so you stop paying for capacity you never use.",
  },
  {
    icon: Scaling,
    title: "Rightsizing",
    description:
      "Get concrete instance-type recommendations with projected monthly savings and confidence scores.",
  },
  {
    icon: Tags,
    title: "Tag Compliance",
    description:
      "Enforce tagging policies across every account and chase down resources missing required metadata.",
  },
  {
    icon: BellRing,
    title: "Smart Alerts",
    description:
      "Slack and email digests for cost spikes, new waste and failed syncs — tuned to the severity you care about.",
  },
];

const multiCloud = [
  {
    name: "Amazon Web Services",
    short: "AWS",
    detail: "EC2, EBS, Elastic IPs, snapshots, Cost Explorer & CloudWatch.",
    dot: "bg-foreground",
    ring: "ring-border",
  },
  {
    name: "Microsoft Azure",
    short: "Azure",
    detail: "Subscriptions, VMs and disks via a production-shaped provider.",
    dot: "bg-muted-foreground",
    ring: "ring-border",
  },
  {
    name: "Google Cloud",
    short: "GCP",
    detail: "Projects and compute resources through a unified abstraction.",
    dot: "bg-muted-foreground/60",
    ring: "ring-border",
  },
];

const selfHostPoints = [
  "Runs entirely on your own Linux VM — your data never leaves your infra",
  "One Docker Compose stack: Caddy, Next.js, Spring Boot & PostgreSQL",
  "Automatic HTTPS, encrypted credentials at rest and JWT auth built in",
  "Demo data mode means it's fully usable with zero cloud credentials",
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid bg-radial-fade opacity-60" />
        <div className="absolute left-1/2 top-[-10%] h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-foreground/10 blur-[140px]" />
        <div className="absolute right-[5%] top-[30%] h-[320px] w-[320px] rounded-full bg-foreground/5 blur-[120px]" />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 glass">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#multi-cloud" className="transition-colors hover:text-foreground">
              Multi-cloud
            </a>
            <a href="#self-host" className="transition-colors hover:text-foreground">
              Self-host
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" variant="gradient" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-6 gap-1.5 border-border/70 bg-card/50 py-1 pl-1.5 pr-3 text-xs backdrop-blur"
            >
              <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                Open source
              </span>
              <span className="text-muted-foreground">
                Apache-2.0 · self-hostable · multi-cloud
              </span>
            </Badge>

            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Take control of your{" "}
              <span className="text-gradient">multi-cloud spend</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              CloudManagerPro is the open-source FinOps platform that finds waste,
              right-sizes resources and enforces tagging across AWS, Azure and GCP
              — all running on infrastructure you own.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="gradient" asChild>
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <Github className="h-4 w-4" />
                  View GitHub
                </a>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <a href="#self-host">
                  <Server className="h-4 w-4" />
                  Deploy on server
                </a>
              </Button>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              No credit card. No SaaS lock-in.
            </p>
          </div>

          {/* screenshot placeholder */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="rounded-2xl border border-border/70 bg-card/60 p-2 shadow-2xl backdrop-blur glow-sm">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
                <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                  <span className="ml-3 text-xs text-muted-foreground">
                    cloudmanager.example.com/dashboard
                  </span>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-3">
                  {[
                    { label: "Monthly spend", value: "$48,210", tone: "text-foreground" },
                    { label: "Estimated savings", value: "$12,640", tone: "text-foreground" },
                    { label: "Idle resources", value: "37", tone: "text-muted-foreground" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="surface p-4 text-left"
                    >
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>
                        {card.value}
                      </p>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-2/3 rounded-full bg-foreground/70" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-2 px-6 pb-6">
                  {[40, 65, 52, 78, 60, 88, 72, 95, 80, 70, 90, 62].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-foreground/60"
                        style={{ height: `${h}px` }}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need for cloud FinOps
            </h2>
            <p className="mt-4 text-muted-foreground">
              A complete optimization toolkit — not just dashboards. Find waste,
              fix it safely and keep it from coming back.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group surface surface-hover p-6"
              >
                <span className="inline-grid h-11 w-11 place-items-center rounded-xl border border-border/70 bg-muted text-foreground transition-transform group-hover:scale-105">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* multi-cloud */}
        <section
          id="multi-cloud"
          className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="muted" className="mb-4">
                <Boxes className="h-3.5 w-3.5" />
                One pane of glass
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Every cloud, unified
              </h2>
              <p className="mt-4 text-muted-foreground">
                A single provider abstraction normalizes resources, costs and
                metrics across clouds — so resource explorer, cleanup and cost
                analysis all work the same no matter where things run.
              </p>
              <div className="mt-8 space-y-3">
                {multiCloud.map((cloud) => (
                  <div
                    key={cloud.short}
                    className={`flex items-start gap-4 rounded-xl border border-border/70 bg-card/60 p-4 ring-1 ${cloud.ring}`}
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${cloud.dot}`}
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {cloud.name}{" "}
                        <span className="text-muted-foreground">
                          ({cloud.short})
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cloud.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="surface p-8 glow-sm">
                <div className="grid grid-cols-3 gap-4">
                  {multiCloud.map((cloud) => (
                    <div
                      key={cloud.short}
                      className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-5"
                    >
                      <span
                        className={`grid h-12 w-12 place-items-center rounded-full ${cloud.dot} bg-opacity-15 text-sm font-bold`}
                      >
                        {cloud.short.slice(0, 2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {cloud.short}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-border/60 bg-background/60 p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Normalized resources
                    </span>
                    <span className="font-semibold">1,284</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      { w: "w-[46%]", c: "bg-foreground/70" },
                      { w: "w-[32%]", c: "bg-foreground/50" },
                      { w: "w-[22%]", c: "bg-foreground/30" },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        className="h-2 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <div className={`h-full rounded-full ${bar.c} ${bar.w}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* self-host */}
        <section
          id="self-host"
          className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-[#0b0b0e] shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <Terminal className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs text-zinc-400">deploy.sh</span>
                </div>
                <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed text-zinc-300">
                  <code>{`# 1. Clone & configure
git clone ${GITHUB_URL}.git
cd cloudmanagerpro/docker
cp .env.production.example .env.production

# 2. Set your domain + secrets, then launch
docker compose --env-file .env.production \\
  -f docker-compose.prod.yml up -d --build

# 3. Caddy issues HTTPS automatically ✨
#    https://cloudmanager.example.com`}</code>
                </pre>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <Badge variant="muted" className="mb-4">
                <Server className="h-3.5 w-3.5" />
                Self-hosted
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Deploy on your own Linux VM in minutes
              </h2>
              <p className="mt-4 text-muted-foreground">
                Ship the whole stack with one Docker Compose command behind a
                Caddy reverse proxy. No third-party SaaS, no per-seat pricing —
                you own the data and the deployment.
              </p>
              <ul className="mt-8 space-y-3">
                {selfHostPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-foreground/10 text-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="gradient" asChild>
                  <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                    <Github className="h-4 w-4" />
                    Star on GitHub
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/signup">Try the demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* trust strip */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Tenant isolation",
                text: "Every query scoped per user with strict isolation.",
              },
              {
                icon: Lock,
                title: "Encrypted secrets",
                text: "Cloud credentials sealed with AES-256-GCM at rest.",
              },
              {
                icon: Layers,
                title: "Demo-first",
                text: "Realistic synthetic data so you can explore instantly.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/40 p-5"
              >
                <item.icon className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* final CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-10 text-center shadow-xl sm:p-16">
            <div className="pointer-events-none absolute inset-0 bg-grid bg-radial-fade opacity-40" />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Start optimizing your cloud today
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Spin up CloudManagerPro with demo data in seconds, then connect
                your real accounts when you&apos;re ready.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" variant="gradient" asChild>
                  <Link href="/signup">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                    <Github className="h-4 w-4" />
                    View GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <p className="text-xs text-muted-foreground">
            Apache-2.0 licensed · Self-hostable multi-cloud FinOps
          </p>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="transition-colors hover:text-foreground"
            >
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
