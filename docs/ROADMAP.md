# Roadmap

Where **CloudManagerPro** is today and where it's headed. This is a direction-of-travel document, not a
dated commitment.

---

## Available now (MVP)

The current release is a fully usable, self-hostable multi-cloud FinOps platform:

- **Accounts & auth** — email signup/login, JWT (HS256) sessions, BCrypt passwords.
- **Multi-tenant by design** — strict tenant isolation enforced on every query.
- **Cloud connections** — AWS via static keys or IAM Role ARN + External ID; Azure and GCP connect as
  production-shaped demo stubs.
- **AWS: real-ish + demo fallback** — real AWS SDK v2 calls (EC2/EBS/EIP/snapshots, CloudWatch metrics,
  Cost Explorer) when credentials/role are present and demo mode is off; otherwise realistic synthetic
  data.
- **Demo mode by default** (`ENABLE_DEMO_DATA=true`) — the entire product is explorable with zero cloud
  credentials.
- **Unified inventory** — searchable, filterable resource explorer across providers/regions/types.
- **Waste detection** — idle compute, orphaned resources, unattached disks, unused IPs, old snapshots,
  missing tags, and cost waste.
- **Cost insights** — summary, trend, and breakdowns by provider/service/region, plus savings
  opportunities.
- **Tag compliance** — policy scoring with per-resource offender lists.
- **Rightsizing** — downsizing recommendations with estimated savings.
- **Unified Optimize hub** — Cleanup, Idle, and Rightsizing merged into one tabbed page
  (`/dashboard/optimize`) with an Overview of top savings opportunities; old `/dashboard/{cleanup,idle,
  rightsizing}` URLs redirect to the matching tab.
- **Resource actions** — Start / Stop / Restart / Resize / Edit tags / Terminate plus storage cleanup,
  driven from the Resources detail drawer and a multi-select **bulk action bar**, with one-click
  **Apply** on idle/rightsizing recommendations. Every action is dry-run → confirm → execute, labeled
  per-resource as real or simulated (`providerMode`).
- **Snooze & dismiss** — hide a recommendation for 7/30/custom days (it auto-returns) or dismiss it
  permanently, across idle/rightsizing/cleanup.
- **Alerts** — Slack + email digests with test buttons; email no-ops gracefully when SMTP is unset.
- **Safe actions** — always-on dry-run; real cloud mutations disabled by default
  (`ENABLE_REAL_CLOUD_ACTIONS=false`) and gated again per-account (demo/Azure/GCP simulate);
  type-to-confirm for destructive actions; every action audited.
- **Monochrome UI** — a sharp black / white / gray interface (resend.com-style) in both light and dark
  modes, with red reserved for destructive/error states and grayscale charts.
- **Logs** — action, sync, and alert history.
- **Self-hosting** — one Linux VM, one command, automatic HTTPS via Caddy; data persists across
  restarts.

### Known MVP simplifications (intentional)

- AWS is real-ish with a demo fallback; **Azure/GCP are demo stubs**.
- Destructive actions are **simulated + logged** unless real actions are explicitly enabled.
- Cost/metrics are **demo-generated** unless real AWS data is available.
- A single-workspace placeholder workspace switcher (no full multi-workspace yet).
- Billing, team RBAC, hosted analytics, and advanced AI are **roadmap placeholders** (below).

---

## Planned next

### Resource actions (Phase 2)
Building on the unified, safety-gated action framework shipped above:
- **Change sets** — queue N dry-runs into a single review panel, then batch-execute them as one
  reviewed unit (new `change_sets` table).
- **Scheduling** — schedule actions for a maintenance window or cron (`scheduled_actions` entity + a
  scheduler), e.g. "stop these instances every night at 20:00".
- **Auto-remediation** — per-user `remediation_rules` (e.g. auto-stop instances idle > 14 days)
  evaluated by the `AnalysisScheduler`, with a dry-run/approve safety mode.
- **Rollback** — store a pre-action snapshot in `action_logs.metadata` and offer one-click rollback
  where the cloud API allows it (e.g. re-start a stopped instance; deletes remain irreversible).
- **Custom resize picker** — choose any compatible instance type (dropdown fed from `InstanceCatalog`)
  instead of only the recommended type.
- **RDS / Kubernetes actions** — new resource types in sync plus matching action handlers (RDS instance
  modify/stop, EKS/AKS/GKE node-group resize).
- **Bulk select everywhere** — extend the Resources bulk-action bar pattern to the Optimize tabs so
  recommendations can be applied/snoozed in bulk.

### Cloud coverage
- **Full Azure implementation** — real Azure SDK integration (VMs, managed disks, public IPs, snapshots,
  Cost Management) replacing the demo stub.
- **Full GCP implementation** — real GCP integration (Compute Engine instances, persistent disks,
  static IPs, snapshots, Billing/BigQuery export) replacing the demo stub.

### New optimization domains
- **Kubernetes cost optimization** — workload/namespace cost allocation, idle node and over-provisioned
  request/limit detection across EKS/AKS/GKE.

### Smarter analysis & governance
- **Policy engine** — author guardrail policies (required tags, allowed regions/instance families,
  budget thresholds) and continuously evaluate resources against them.
- **AI recommendations** — natural-language insights and prioritized, explainable savings actions built
  on top of the metrics/cost data.

### Product & commercialization (future add-ons)
- **Hosted SaaS option** — a managed, multi-tenant cloud offering for teams that don't want to self-host.
- **Team management / enterprise RBAC** — organizations, multiple workspaces, invitations, and
  role-based access control.
- **Billing (Stripe)** — subscription plans and metering for the hosted/commercial tiers.

> The open-source, self-hosted core remains the foundation. Hosted SaaS, enterprise RBAC, and
> Stripe-based billing are envisioned as **future commercial add-ons** layered on top of it.

---

## Related docs

- [README](../README.md) — overview and feature list
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the system is built (and where new providers plug in)
- [CONTRIBUTING.md](CONTRIBUTING.md) — help build the roadmap
