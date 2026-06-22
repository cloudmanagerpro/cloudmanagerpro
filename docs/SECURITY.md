# Security

CloudManagerPro holds cloud credentials and can act on real infrastructure, so security is a
first-class concern. This document covers credential encryption, authentication, tenant isolation,
cleanup safety, cloud IAM best practices (with a concrete least-privilege AWS policy), and
secret-handling rules.

---

## Credential encryption (AES-256-GCM)

Cloud account credentials (access keys, secret keys, role config) are **encrypted at rest** before they
ever touch the database.

- **Algorithm:** AES-256-GCM (authenticated encryption — confidentiality + integrity).
- **Key:** derived from the `ENCRYPTION_SECRET` environment variable. Provide a long, random value:

```bash
openssl rand -base64 48
```

- **How it works:** `EncryptionService` encrypts/decrypts values; a JPA `AttributeConverter` transparently
  encrypts encrypted columns on write and decrypts on read. Stored ciphertext is base64-encoded
  (`base64(AES-GCM)`), including a per-record IV/nonce and the GCM auth tag.
- **Never exposed to the frontend:** secrets are **always masked** in API responses (e.g.
  `accessKeyIdMasked`, `slackWebhookUrlMasked`). The plaintext secret is only ever used server-side to
  call the provider.

> **Rotating `ENCRYPTION_SECRET`** invalidates previously stored ciphertext (existing credentials can no
> longer be decrypted). Plan a re-entry of cloud credentials if you must rotate it.

---

## Authentication (JWT + BCrypt)

- **Passwords** are hashed with **BCrypt** (salted, adaptive). Plaintext passwords are never stored or
  logged.
- **Tokens** are stateless **JWT (HS256)** signed with `JWT_SECRET`. On signup/login the API returns
  `{ token, user }`; clients send `Authorization: Bearer <token>` on every protected request.
- **`JwtAuthenticationFilter`** validates the token on each request and populates the Spring
  `SecurityContext`.
- **Public endpoints:** only `POST /api/auth/signup`, `POST /api/auth/login`, and `GET /api/health`
  (plus optional Swagger). **Everything else requires a valid token.**
- Use a strong, stable `JWT_SECRET` (`openssl rand -base64 48`). Changing it invalidates all existing
  sessions (everyone must log in again).

---

## Tenant isolation (enforced on every query)

CloudManagerPro is multi-tenant: each user only ever sees their own data, enforced **server-side**.

- Every tenant-owned table has an indexed `user_id` column.
- Repositories expose **only tenant-scoped finders** (e.g. `findByIdAndUserId`, `findAllByUserId`).
- Services read the authenticated user via a `CurrentUser` helper and always pass `userId` into queries.
- A request for an ID that exists but belongs to another tenant returns **`404 Not Found`** — never
  another tenant's data. There is no client-trusted `userId` input.

See [ARCHITECTURE.md](ARCHITECTURE.md#9-tenant-isolation-model) for the request flow.

---

## Resource & cleanup action safety

All mutating actions — cleanup **and** the Resources drawer / bulk bar / recommendation **Apply**
(Start, Stop, Restart, Resize, Edit tags, Terminate, Delete volume, Release IP, Delete snapshot) — flow
through one safety-gated path and are protected by multiple layers:

1. **Dry-run is always available.** Every action has a dry-run that simulates it and reports what would
   happen — it never mutates cloud state, regardless of any flag.
2. **Two-layer gate for real changes.** A real cloud mutation happens **only** when
   `ENABLE_REAL_CLOUD_ACTIONS=true` **and** the resource's account resolves to a real (non-demo)
   provider connection. `ENABLE_REAL_CLOUD_ACTIONS=false` is the default; while off (or for Azure/GCP,
   which are demo stubs), execute returns a structured `{ executed: false, simulated: true,
   providerMode: "SIMULATED" }` result — never a silent success, never a real change.
3. **Type-to-confirm for destructive actions.** In real mode, destructive actions (terminate / delete /
   release) require a `confirmation` matching the resource name, its external id, or the literal
   `DELETE`. The UI enforces this with a type-to-confirm field.
4. **Everything is audited.** Every dry-run and execute (including each bulk item, recommendation
   apply, and snooze/dismiss) writes an `ActionLog` (who, what, when, dry-run vs real, outcome),
   surfaced at `GET /api/logs/actions`.
5. **Least privilege at the cloud edge.** Even with the flag on, the IAM permissions you grant bound
   what CloudManagerPro can do (see below). Grant only read-only access if you want analysis without any
   ability to change infrastructure.

> Recommended posture: keep `ENABLE_REAL_CLOUD_ACTIONS=false` and grant a **read-only** IAM policy. Turn
> on real actions (and add the scoped action permissions) only when you've reviewed the candidates and
> trust the safeguards.

---

## Cloud IAM best practices

### Prefer IAM Roles (Role ARN + External ID) over static keys

Static access keys are long-lived secrets that are easy to leak. Prefer a cross-account **IAM Role**
that CloudManagerPro assumes via STS, protected by an **External ID** (mitigates the "confused deputy"
problem).

When you add an AWS account in the UI, choose **Role** and provide the **Role ARN** plus an **External
ID** (a value you choose, e.g. `cmp-7f3a9c2e`). Create the role in your AWS account with this **trust
policy**, allowing the AWS principal that CloudManagerPro runs as to assume it only when presenting the
matching External ID:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<CLOUDMANAGERPRO_AWS_ACCOUNT_ID>:root" },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": { "sts:ExternalId": "cmp-7f3a9c2e" }
      }
    }
  ]
}
```

- Replace `<CLOUDMANAGERPRO_AWS_ACCOUNT_ID>` with the AWS account whose identity your CloudManagerPro
  instance uses (e.g. the EC2 instance profile or IAM user backing the server).
- Use a unique, hard-to-guess External ID per connection.
- If you must use static keys instead, create a dedicated IAM user with **only** the policy below, and
  rotate the keys regularly.

### Least-privilege permissions policy

Attach this **permissions policy** to the role (or user). It grants read-only inventory/metrics/cost
access plus **only** the specific resource actions CloudManagerPro performs (start/stop/restart/resize,
tagging, terminate, and storage/IP cleanup). Drop the `ScopedResourceActions` statement entirely if you
want analysis-only (recommended default — and remember these actions still do nothing unless
`ENABLE_REAL_CLOUD_ACTIONS=true`).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyInventory",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeAddresses",
        "ec2:DescribeSnapshots",
        "ec2:DescribeImages",
        "ec2:DescribeRegions",
        "ec2:DescribeTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ReadOnlyMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ReadOnlyCostExplorer",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ScopedResourceActions",
      "Effect": "Allow",
      "Action": [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances",
        "ec2:TerminateInstances",
        "ec2:ModifyInstanceAttribute",
        "ec2:CreateTags",
        "ec2:DeleteVolume",
        "ec2:ReleaseAddress",
        "ec2:DeleteSnapshot"
      ],
      "Resource": "*"
    }
  ]
}
```

Notes:
- `ec2:Describe*` actions and `cloudwatch`/`ce` read actions do not support resource-level
  restrictions, so `Resource: "*"` is expected for those statements.
- The action permissions map directly to the actions CloudManagerPro can perform from the Resources
  drawer, the bulk-action bar, and recommendation **Apply**:
  - `StartInstances` (Start), `StopInstances` (Stop / idle apply), `RebootInstances` (Restart),
    `TerminateInstances` (Terminate).
  - `ModifyInstanceAttribute` (Resize — the instance is stopped, retyped, then started, so resize needs
    `Stop`/`Start` too), and `CreateTags` (Edit tags / tag remediation).
  - `DeleteVolume` (unattached disks), `ReleaseAddress` (unused Elastic IPs), `DeleteSnapshot` (old
    snapshots).
  - Remove any individual action you don't want to permit — CloudManagerPro degrades gracefully and the
    UI surfaces the AWS error for a denied action.
- For tighter control, scope `ScopedResourceActions` with condition keys (e.g. require a specific tag
  like `aws:ResourceTag/cloudmanagerpro=managed`) so only opted-in resources can be modified.
- Azure and GCP are demo stubs in the MVP; grant their real permissions when those integrations land
  (see [ROADMAP.md](ROADMAP.md)).

---

## Secret handling

- **Never commit secrets.** Only `*.example` templates are tracked by git. The real files
  (`docker/.env.production`, any `.env`) are git-ignored.
- **Generate strong secrets** for `JWT_SECRET`, `ENCRYPTION_SECRET`, and database passwords
  (`openssl rand -base64 48`). Never ship the placeholder values.
- **Secrets are masked** in all API responses and must never be written to logs.
- **If a secret is ever committed or leaked, rotate it immediately:**
  - Generate a new value and redeploy.
  - For AWS keys: deactivate and delete the exposed access key in IAM, then issue a new one (or switch
    to a role). Assume the old key is compromised.
  - Rotating `JWT_SECRET` logs everyone out; rotating `ENCRYPTION_SECRET` requires re-entering cloud
    credentials (old ciphertext becomes undecryptable).
  - Purge the secret from git history (e.g. `git filter-repo`) and force-protect the branch — but treat
    the secret as compromised regardless, since it may already be cached.

---

## Network & transport

- **TLS everywhere from the browser:** Caddy terminates HTTPS and adds HSTS and hardening headers
  (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).
- **Minimal exposure:** only Caddy is published (ports 80/443). The backend, frontend, and PostgreSQL
  run on an internal Docker network. **PostgreSQL is never exposed publicly** — see the
  [UFW firewall section](DEPLOYMENT_VM.md#step-8--firewall-ufw).

---

## Reporting a vulnerability

If you discover a security issue, please report it privately to the maintainers rather than opening a
public issue. See [CONTRIBUTING.md](CONTRIBUTING.md) for contact and process.

---

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — tenant isolation and engine internals
- [DEPLOYMENT_VM.md](DEPLOYMENT_VM.md) — firewall, HTTPS, and secret configuration
- [API.md](API.md) — auth flow and error format
