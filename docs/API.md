# API Reference

REST API for **CloudManagerPro**. This document is the contract for every endpoint: method, path, auth
requirement, an example request body, and an example JSON response.

- **Base URL (production):** `https://<APP_DOMAIN>/api` (Caddy proxies `/api/*` to the backend)
- **Base URL (local dev):** `http://localhost:8080/api`
- **Content type:** `application/json` for all request and response bodies
- **IDs:** all resources use UUID identifiers

> Field names and example values below reflect the planned data model. Treat shapes as illustrative;
> the backend is the source of truth for exact serialization.

---

## Authentication

CloudManagerPro uses **stateless JWT (HS256)** bearer tokens.

1. Call `POST /api/auth/signup` or `POST /api/auth/login`. Both return a token and the user:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI...",
  "user": {
    "id": "b3f1c2d4-1111-2222-3333-444455556666",
    "email": "you@example.com",
    "name": "Ada Lovelace",
    "createdAt": "2026-06-18T06:00:00Z"
  }
}
```

2. Send the token on every protected request via the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI...
```

**Public endpoints** (no token required): `POST /api/auth/signup`, `POST /api/auth/login`,
`GET /api/health`. **Every other endpoint requires a valid Bearer token** and is scoped to the
authenticated user (tenant isolation — see [SECURITY.md](SECURITY.md)).

---

## Error format

All errors use a uniform JSON shape. Secrets and stack traces are never included.

```json
{
  "timestamp": "2026-06-18T06:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Cloud account not found"
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | Validation failed / malformed body |
| `401 Unauthorized` | Missing/invalid/expired token, or bad credentials |
| `403 Forbidden` | Authenticated but not allowed (e.g. real actions disabled) |
| `404 Not Found` | Resource does not exist **or** belongs to another tenant |
| `409 Conflict` | Duplicate (e.g. email already registered) |
| `500 Internal Server Error` | Unexpected server error |

---

## Endpoint index

| Domain | Endpoints |
| --- | --- |
| [Auth & health](#auth--health) | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `GET /health` |
| [Cloud accounts](#cloud-accounts) | `GET/POST /cloud-accounts`, `GET/DELETE /cloud-accounts/{id}`, `POST /cloud-accounts/{id}/test`, `POST /cloud-accounts/{id}/sync` |
| [Sync](#sync) | `POST /sync/{cloudAccountId}`, `GET /sync/jobs`, `GET /sync/jobs/{id}` |
| [Resources](#resources) | `GET /resources`, `GET /resources/{id}` |
| [Resource actions](#resource-actions) | `GET /resources/{id}/actions`, `POST /resources/{id}/actions/dry-run`, `POST /resources/{id}/actions/execute`, `POST /actions/bulk/dry-run`, `POST /actions/bulk/execute` |
| [Cleanup](#cleanup) | `GET /cleanup/candidates`, `POST /cleanup/analyze`, `POST /cleanup/{id}/dry-run`, `POST /cleanup/{id}/execute`, `POST /cleanup/{id}/ignore` |
| [Cost](#cost) | `GET /cost/summary`, `/trend`, `/by-provider`, `/by-service`, `/by-region`, `/savings-opportunities` |
| [Idle](#idle) | `GET /idle`, `POST /idle/analyze`, `POST /idle/{id}/apply` |
| [Tags](#tags) | `GET /tags/compliance`, `POST /tags/analyze` |
| [Rightsizing](#rightsizing) | `GET /rightsizing`, `POST /rightsizing/analyze`, `POST /rightsizing/{id}/apply` |
| [Recommendations](#recommendations-snooze--dismiss) | `POST /recommendations/{type}/{id}/snooze`, `POST /recommendations/{type}/{id}/dismiss` |
| [Alerts & settings](#alerts--settings) | `GET/PUT /settings/alerts`, `POST /alerts/test-slack`, `POST /alerts/test-email` |
| [Logs](#logs) | `GET /logs/actions`, `GET /logs/sync`, `GET /logs/alerts` |

---

## Auth & health

### `POST /api/auth/signup` — _public_
Create an account and receive a token.

Request:

```json
{
  "email": "you@example.com",
  "password": "a-strong-password",
  "name": "Ada Lovelace"
}
```

Response `201 Created`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "b3f1c2d4-1111-2222-3333-444455556666",
    "email": "you@example.com",
    "name": "Ada Lovelace",
    "createdAt": "2026-06-18T06:00:00Z"
  }
}
```

### `POST /api/auth/login` — _public_
Exchange credentials for a token.

Request:

```json
{
  "email": "you@example.com",
  "password": "a-strong-password"
}
```

Response `200 OK`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "b3f1c2d4-1111-2222-3333-444455556666",
    "email": "you@example.com",
    "name": "Ada Lovelace",
    "createdAt": "2026-06-18T06:00:00Z"
  }
}
```

### `GET /api/auth/me` — _Bearer_
Return the current user. Used by the frontend auth guard.

Response `200 OK`:

```json
{
  "id": "b3f1c2d4-1111-2222-3333-444455556666",
  "email": "you@example.com",
  "name": "Ada Lovelace",
  "createdAt": "2026-06-18T06:00:00Z"
}
```

### `GET /api/health` — _public_
Liveness/readiness probe (also used by the container `HEALTHCHECK`).

Response `200 OK`:

```json
{ "status": "UP" }
```

---

## Cloud accounts

A cloud account stores (encrypted) credentials for one provider connection. Secrets are **never**
returned — responses only include masked hints.

### `GET /api/cloud-accounts` — _Bearer_
List the current user's connected accounts.

Response `200 OK`:

```json
[
  {
    "id": "11111111-aaaa-bbbb-cccc-222222222222",
    "provider": "AWS",
    "name": "Production AWS",
    "authType": "ROLE",
    "roleArn": "arn:aws:iam::123456789012:role/CloudManagerProReadOnly",
    "accessKeyIdMasked": null,
    "defaultRegion": "us-east-1",
    "status": "CONNECTED",
    "lastSyncedAt": "2026-06-18T05:50:00Z",
    "createdAt": "2026-06-01T12:00:00Z"
  }
]
```

### `POST /api/cloud-accounts` — _Bearer_
Connect a new account. Provide either static keys **or** a role (Role ARN + External ID is preferred —
see [SECURITY.md](SECURITY.md)).

Request:

```json
{
  "provider": "AWS",
  "name": "Production AWS",
  "authType": "ROLE",
  "roleArn": "arn:aws:iam::123456789012:role/CloudManagerProReadOnly",
  "externalId": "cmp-7f3a9c2e",
  "defaultRegion": "us-east-1"
}
```

Response `201 Created`:

```json
{
  "id": "11111111-aaaa-bbbb-cccc-222222222222",
  "provider": "AWS",
  "name": "Production AWS",
  "authType": "ROLE",
  "roleArn": "arn:aws:iam::123456789012:role/CloudManagerProReadOnly",
  "defaultRegion": "us-east-1",
  "status": "PENDING",
  "lastSyncedAt": null,
  "createdAt": "2026-06-18T06:10:00Z"
}
```

### `GET /api/cloud-accounts/{id}` — _Bearer_
Fetch one account (must belong to the caller).

Response `200 OK`: same shape as a list item above.

### `DELETE /api/cloud-accounts/{id}` — _Bearer_
Disconnect and remove an account (and its derived data).

Response `204 No Content`.

### `POST /api/cloud-accounts/{id}/test` — _Bearer_
Validate credentials/role without syncing.

Response `200 OK`:

```json
{
  "success": true,
  "message": "Connection successful",
  "checkedAt": "2026-06-18T06:12:00Z"
}
```

### `POST /api/cloud-accounts/{id}/sync` — _Bearer_
Trigger an on-demand sync for this account (convenience alias of `POST /api/sync/{cloudAccountId}`).

Response `202 Accepted`:

```json
{
  "jobId": "9c9c9c9c-1234-5678-9abc-def012345678",
  "cloudAccountId": "11111111-aaaa-bbbb-cccc-222222222222",
  "status": "RUNNING",
  "startedAt": "2026-06-18T06:15:00Z"
}
```

---

## Sync

### `POST /api/sync/{cloudAccountId}` — _Bearer_
Start a sync job for the given account.

Response `202 Accepted`:

```json
{
  "jobId": "9c9c9c9c-1234-5678-9abc-def012345678",
  "cloudAccountId": "11111111-aaaa-bbbb-cccc-222222222222",
  "status": "RUNNING",
  "startedAt": "2026-06-18T06:15:00Z"
}
```

### `GET /api/sync/jobs` — _Bearer_
List recent sync jobs for the user.

Response `200 OK`:

```json
[
  {
    "id": "9c9c9c9c-1234-5678-9abc-def012345678",
    "cloudAccountId": "11111111-aaaa-bbbb-cccc-222222222222",
    "provider": "AWS",
    "status": "SUCCESS",
    "resourcesDiscovered": 142,
    "resourcesCreated": 12,
    "resourcesUpdated": 130,
    "resourcesRemoved": 3,
    "startedAt": "2026-06-18T06:15:00Z",
    "finishedAt": "2026-06-18T06:15:42Z",
    "errorMessage": null
  }
]
```

### `GET /api/sync/jobs/{id}` — _Bearer_
Fetch a single sync job.

Response `200 OK`: same shape as a list item above.

---

## Resources

The unified inventory across all providers.

### `GET /api/resources` — _Bearer_
List resources with optional filters (all query params are optional and combinable).

| Param | Type | Description |
| --- | --- | --- |
| `provider` | enum | `AWS` \| `AZURE` \| `GCP` |
| `resourceType` | enum | e.g. `EC2_INSTANCE`, `EBS_VOLUME`, `ELASTIC_IP`, `SNAPSHOT` |
| `region` | string | e.g. `us-east-1` |
| `status` | string | provider status, e.g. `running`, `available` |
| `wasteState` | enum | e.g. `NONE`, `IDLE`, `ORPHANED`, `UNATTACHED`, `UNUSED`, `OLD_SNAPSHOT`, `MISSING_TAGS` |
| `search` | string | free-text match on name/id/tags |
| `tag` | string | tag filter, e.g. `env:prod` |
| `minCost` | number | minimum monthly cost |
| `maxCost` | number | maximum monthly cost |

Example: `GET /api/resources?provider=AWS&wasteState=UNATTACHED&minCost=5`

Response `200 OK`:

```json
{
  "items": [
    {
      "id": "33333333-dddd-eeee-ffff-444444444444",
      "cloudAccountId": "11111111-aaaa-bbbb-cccc-222222222222",
      "provider": "AWS",
      "resourceType": "EBS_VOLUME",
      "externalId": "vol-0a1b2c3d4e5f6",
      "name": "orphaned-data-vol",
      "region": "us-east-1",
      "status": "available",
      "wasteState": "UNATTACHED",
      "monthlyCost": 18.40,
      "tags": { "env": "prod", "team": "data" },
      "metadata": { "sizeGiB": 200, "volumeType": "gp3" },
      "firstSeenAt": "2026-05-01T00:00:00Z",
      "lastSeenAt": "2026-06-18T06:15:00Z"
    }
  ],
  "page": 0,
  "size": 50,
  "totalItems": 1,
  "totalPages": 1
}
```

### `GET /api/resources/{id}` — _Bearer_
Fetch full detail for one resource (used by the detail drawer).

Response `200 OK`: a single resource object as shown in `items` above, plus any provider metrics.

---

## Resource actions

The unified action API powers the Resources drawer, the bulk-action bar, and the recommendation
**Apply** buttons. Every action goes through one safety-gated path:

**dry-run (always allowed) → confirm → execute → provider `executeAction` → audit + async re-sync.**

- **Two-layer safety gate.** Real cloud mutations happen **only** when `ENABLE_REAL_CLOUD_ACTIONS=true`
  **and** the resource's account resolves to a real (non-demo) provider connection. Otherwise the action
  is **simulated**: the API returns `200 OK` with `success: true`, `executed: false`, `simulated: true`,
  `providerMode: "SIMULATED"` — never a silent success and never a real change.
- **Confirmation** is enforced only for **destructive** actions (`TERMINATE`, `DELETE_VOLUME`,
  `DELETE_SNAPSHOT`, `RELEASE_EIP`) **in `REAL` mode**: send `confirmation` equal to the resource name,
  its external id, or the literal `DELETE`.
- **Tenant-scoped.** An `id` that belongs to another tenant returns `404 Not Found`.
- **Audited.** Every dry-run and execute (including bulk items and recommendation applies) writes an
  `ActionLog`, surfaced at [`GET /api/logs/actions`](#logs).

### `ActionResultDto` (shared result shape)

`dry-run`, `execute`, the per-item bulk `results[]`, and `rightsizing|idle` **apply** all return this
object:

```json
{
  "success": true,
  "executed": false,
  "dryRun": true,
  "simulated": true,
  "providerMode": "SIMULATED",
  "action": "STOP",
  "status": "DRY_RUN",
  "resourceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "resourceName": "web-1",
  "message": "Dry run: would STOP on EC2_INSTANCE i-0abc123",
  "estimatedMonthlySavings": null,
  "fromType": null,
  "toType": null
}
```

| Field | Meaning |
| --- | --- |
| `success` | The request was handled without error (a simulated action **is** a success). |
| `executed` | A real cloud mutation was performed (`true` only when `providerMode == REAL` and it succeeded). |
| `dryRun` | This was a preview; nothing was mutated. |
| `simulated` | The action was simulated, not executed for real (`providerMode == SIMULATED`). |
| `providerMode` | `"REAL"` or `"SIMULATED"` for this resource's account. |
| `action` | The `ActionType` that was run. |
| `status` | `DRY_RUN`, `EXECUTED`, `SIMULATED`, or `FAILED`. |
| `resourceId` / `resourceName` | The affected resource. |
| `message` | Human-readable outcome. |
| `estimatedMonthlySavings` | Optional. Populated for `RESIZE` previews/applies (from the recommendation); `null` otherwise. |
| `fromType` / `toType` | Optional. Populated for `RESIZE` (current → target instance type); `null` otherwise. |

> The three trailing fields are optional preview hints used by the resize dialog; clients must treat
> them as nullable.

### `GET /api/resources/{id}/actions` — _Bearer_
List the actions valid for a resource given its **type** and **current state** (e.g. a running EC2
instance offers Stop/Restart/Resize/Edit tags/Terminate; a stopped one offers Start/Resize/Edit
tags/Terminate; an unattached volume offers Delete volume).

Response `200 OK`:

```json
{
  "resourceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "provider": "AWS",
  "resourceType": "EC2_INSTANCE",
  "status": "running",
  "providerMode": "SIMULATED",
  "actions": [
    { "action": "STOP", "label": "Stop", "destructive": false, "requiresConfirmation": true, "requiresParams": false, "description": "Stop the instance (compute charges pause; storage/IP charges remain)" },
    { "action": "RESTART", "label": "Restart", "destructive": false, "requiresConfirmation": true, "requiresParams": false, "description": "Reboot the running instance" },
    { "action": "RESIZE", "label": "Resize", "destructive": false, "requiresConfirmation": true, "requiresParams": true, "description": "Change the instance type (the instance is stopped and restarted)" },
    { "action": "ADD_TAGS", "label": "Edit tags", "destructive": false, "requiresConfirmation": true, "requiresParams": true, "description": "Add or update tags on the resource" },
    { "action": "TERMINATE", "label": "Terminate", "destructive": true, "requiresConfirmation": true, "requiresParams": false, "description": "Permanently terminate the instance" }
  ]
}
```

`ActionType` values: `START`, `STOP`, `RESTART`, `RESIZE`, `ADD_TAGS`, `TERMINATE`, `DELETE_VOLUME`,
`RELEASE_EIP`, `DELETE_SNAPSHOT`.

### `POST /api/resources/{id}/actions/dry-run` — _Bearer_
Preview an action. Never mutates cloud state (allowed regardless of the safety flag).

Request:

```json
{ "action": "RESIZE", "params": { "instanceType": "t3.medium" } }
```

- `params.instanceType` — **required for `RESIZE`**. If omitted (e.g. the Resources drawer), the backend
  **defaults to the resource's rightsizing recommendation** `recommendedType`. If there is no
  recommendation, it returns a friendly failed `ActionResultDto` (`success: false`, `status: "FAILED"`,
  HTTP `200`) asking for a target type — **not** a raw `400`.
- `params.tags` — **required for `ADD_TAGS`** (at least one entry), e.g. `{ "tags": { "owner": "team-a" } }`.

Response `200 OK`: an [`ActionResultDto`](#actionresultdto-shared-result-shape) with `dryRun: true`,
`status: "DRY_RUN"`.

### `POST /api/resources/{id}/actions/execute` — _Bearer_
Execute an action (honours the safety gate).

Request:

```json
{ "action": "TERMINATE", "confirmation": "web-1" }
```

Response `200 OK`: an [`ActionResultDto`](#actionresultdto-shared-result-shape). In demo/simulated mode:
`executed: false`, `simulated: true`, `status: "SIMULATED"`. In real mode on success:
`executed: true`, `status: "EXECUTED"`. Missing/invalid `confirmation` for a destructive action in real
mode returns `400`.

### `POST /api/actions/bulk/dry-run` — _Bearer_
### `POST /api/actions/bulk/execute` — _Bearer_
Run one action across many resources (used by the Resources bulk bar — e.g. Stop or Tag several EC2
instances at once).

Request:

```json
{
  "resourceIds": ["aaaaaaaa-…", "bbbbbbbb-…", "cccccccc-…"],
  "action": "STOP",
  "confirmation": null
}
```

Response `200 OK` (`BulkActionResultDto`) — an aggregate summary plus one
[`ActionResultDto`](#actionresultdto-shared-result-shape) per id, in request order (unknown/cross-tenant
ids appear as failed results, never as another tenant's data):

```json
{
  "action": "STOP",
  "dryRun": true,
  "total": 3,
  "succeeded": 3,
  "failed": 0,
  "executed": 0,
  "simulated": 3,
  "results": [
    { "success": true, "executed": false, "dryRun": true, "simulated": true, "providerMode": "SIMULATED", "action": "STOP", "status": "DRY_RUN", "resourceId": "aaaaaaaa-…", "resourceName": "web-1", "message": "Dry run: would STOP on EC2_INSTANCE i-0abc123" }
  ]
}
```

---

## Cleanup

Detect and act on wasteful resources. **Dry-run is always available; real execution is gated by
`ENABLE_REAL_CLOUD_ACTIONS`.** See [SECURITY.md](SECURITY.md).

### `GET /api/cleanup/candidates` — _Bearer_
List current cleanup candidates.

Response `200 OK`:

```json
[
  {
    "id": "55555555-1111-2222-3333-666666666666",
    "resourceId": "33333333-dddd-eeee-ffff-444444444444",
    "provider": "AWS",
    "resourceType": "EBS_VOLUME",
    "wasteState": "UNATTACHED",
    "recommendedAction": "DELETE_VOLUME",
    "estimatedMonthlySavings": 18.40,
    "severity": "MEDIUM",
    "reason": "Volume has been unattached for 38 days",
    "status": "OPEN",
    "detectedAt": "2026-06-18T06:16:00Z"
  }
]
```

### `POST /api/cleanup/analyze` — _Bearer_
Re-run cleanup detection across the user's inventory.

Request: _(empty body, or optionally scope it)_

```json
{ "cloudAccountId": "11111111-aaaa-bbbb-cccc-222222222222" }
```

Response `200 OK`:

```json
{ "candidatesFound": 17, "estimatedMonthlySavings": 412.75, "analyzedAt": "2026-06-18T06:17:00Z" }
```

### `POST /api/cleanup/{id}/dry-run` — _Bearer_
Simulate the cleanup action. **Never** mutates cloud state.

Response `200 OK`:

```json
{
  "candidateId": "55555555-1111-2222-3333-666666666666",
  "action": "DELETE_VOLUME",
  "dryRun": true,
  "wouldSucceed": true,
  "message": "Dry-run: volume vol-0a1b2c3d4e5f6 would be deleted",
  "estimatedMonthlySavings": 18.40,
  "loggedActionId": "77777777-aaaa-bbbb-cccc-888888888888"
}
```

### `POST /api/cleanup/{id}/execute` — _Bearer_
Execute the action **for real**. Returns `403` (and logs a blocked attempt) when
`ENABLE_REAL_CLOUD_ACTIONS=false`; otherwise performs the action.

Response `200 OK` (flag enabled):

```json
{
  "candidateId": "55555555-1111-2222-3333-666666666666",
  "action": "DELETE_VOLUME",
  "dryRun": false,
  "success": true,
  "message": "Volume vol-0a1b2c3d4e5f6 deleted",
  "executedAt": "2026-06-18T06:20:00Z",
  "loggedActionId": "77777777-aaaa-bbbb-cccc-888888888899"
}
```

Response `403 Forbidden` (flag disabled):

```json
{
  "timestamp": "2026-06-18T06:20:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Real cloud actions are disabled (ENABLE_REAL_CLOUD_ACTIONS=false). Use dry-run."
}
```

### `POST /api/cleanup/{id}/ignore` — _Bearer_
Dismiss a candidate so it stops appearing.

Response `200 OK`:

```json
{ "candidateId": "55555555-1111-2222-3333-666666666666", "status": "IGNORED" }
```

---

## Cost

All cost endpoints accept optional `from`/`to` (ISO date) and `provider` query params.

### `GET /api/cost/summary` — _Bearer_
Headline numbers for the dashboard.

Response `200 OK`:

```json
{
  "currency": "USD",
  "currentMonthToDate": 4820.55,
  "previousMonth": 9123.10,
  "forecastThisMonth": 9450.00,
  "potentialMonthlySavings": 412.75,
  "wasteResourceCount": 17
}
```

### `GET /api/cost/trend` — _Bearer_
Daily spend over time (for the trend chart).

Response `200 OK`:

```json
{
  "currency": "USD",
  "points": [
    { "date": "2026-06-16", "cost": 305.12 },
    { "date": "2026-06-17", "cost": 298.77 },
    { "date": "2026-06-18", "cost": 142.30 }
  ]
}
```

### `GET /api/cost/by-provider` — _Bearer_

```json
[
  { "provider": "AWS", "cost": 7200.40 },
  { "provider": "AZURE", "cost": 1320.15 },
  { "provider": "GCP", "cost": 602.55 }
]
```

### `GET /api/cost/by-service` — _Bearer_

```json
[
  { "service": "EC2", "cost": 4100.20 },
  { "service": "EBS", "cost": 980.10 },
  { "service": "S3", "cost": 612.44 }
]
```

### `GET /api/cost/by-region` — _Bearer_

```json
[
  { "region": "us-east-1", "cost": 5300.00 },
  { "region": "eu-west-1", "cost": 1820.40 }
]
```

### `GET /api/cost/savings-opportunities` — _Bearer_

```json
[
  { "category": "UNATTACHED_VOLUMES", "count": 6, "estimatedMonthlySavings": 110.40 },
  { "category": "IDLE_INSTANCES", "count": 4, "estimatedMonthlySavings": 240.00 },
  { "category": "UNUSED_IPS", "count": 7, "estimatedMonthlySavings": 25.55 }
]
```

---

## Idle

### `GET /api/idle` — _Bearer_
List idle/underutilized resources.

Response `200 OK`:

```json
[
  {
    "id": "88888888-1111-2222-3333-999999999999",
    "resourceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "provider": "AWS",
    "resourceType": "EC2_INSTANCE",
    "region": "us-east-1",
    "avgCpuPercent": 2.1,
    "maxCpuPercent": 7.8,
    "observationDays": 14,
    "estimatedMonthlySavings": 60.00,
    "severity": "HIGH",
    "detectedAt": "2026-06-18T06:16:00Z"
  }
]
```

### `POST /api/idle/analyze` — _Bearer_
Re-run idle detection.

Response `200 OK`:

```json
{ "idleFound": 4, "estimatedMonthlySavings": 240.00, "analyzedAt": "2026-06-18T06:17:00Z" }
```

### `POST /api/idle/{id}/apply` — _Bearer_
Apply the natural action for an idle candidate (`{id}` is the **idle candidate** id): running compute →
`STOP`, already-stopped compute → `TERMINATE`, and the matching cleanup action for disks/IPs/snapshots.
Routes through the shared safety-gated action path.

Request _(optional body; omitting it is equivalent to `{ "dryRun": false }`)_:

```json
{ "dryRun": true, "confirmation": null }
```

Response `200 OK`: an [`ActionResultDto`](#actionresultdto-shared-result-shape). On a successful real
execute the candidate is marked dismissed so it leaves the list.

---

## Tags

### `GET /api/tags/compliance` — _Bearer_
Tag-compliance scoring and offenders.

Response `200 OK`:

```json
{
  "requiredTags": ["env", "owner", "cost-center"],
  "compliancePercent": 78.5,
  "totalResources": 142,
  "compliantResources": 111,
  "nonCompliant": [
    {
      "resourceId": "33333333-dddd-eeee-ffff-444444444444",
      "provider": "AWS",
      "resourceType": "EBS_VOLUME",
      "missingTags": ["owner", "cost-center"]
    }
  ]
}
```

### `POST /api/tags/analyze` — _Bearer_
Re-run tag-compliance analysis.

Response `200 OK`:

```json
{ "compliancePercent": 78.5, "nonCompliantCount": 31, "analyzedAt": "2026-06-18T06:17:00Z" }
```

---

## Rightsizing

### `GET /api/rightsizing` — _Bearer_
List rightsizing recommendations.

Response `200 OK`:

```json
[
  {
    "id": "cccccccc-1111-2222-3333-dddddddddddd",
    "resourceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "provider": "AWS",
    "resourceType": "EC2_INSTANCE",
    "region": "us-east-1",
    "currentType": "m5.2xlarge",
    "recommendedType": "m5.large",
    "estimatedMonthlySavings": 180.00,
    "confidence": "HIGH",
    "rationale": "CPU < 10% and memory < 25% over 14 days",
    "detectedAt": "2026-06-18T06:16:00Z"
  }
]
```

### `POST /api/rightsizing/analyze` — _Bearer_
Re-run rightsizing analysis.

Response `200 OK`:

```json
{ "recommendations": 9, "estimatedMonthlySavings": 1240.00, "analyzedAt": "2026-06-18T06:17:00Z" }
```

### `POST /api/rightsizing/{id}/apply` — _Bearer_
Apply a rightsizing recommendation as a `RESIZE` (`{id}` is the **recommendation** id). Defaults to the
recommendation's `recommendedType`; pass `instanceType` to override (custom picker is Phase 2).

Request _(optional body)_:

```json
{ "instanceType": "m5.large", "dryRun": true, "confirmation": null }
```

Response `200 OK`: an [`ActionResultDto`](#actionresultdto-shared-result-shape) with `fromType`/`toType`
and `estimatedMonthlySavings` populated. On a successful real execute the recommendation's status
becomes `APPLIED`.

---

## Recommendations (snooze / dismiss)

Snooze or permanently dismiss a recommendation across engines. `{type}` is one of `idle`,
`rightsizing`, or `cleanup` (`tag` is accepted as a graceful no-op; any other value returns `400`).
`{id}` is the recommendation/candidate id and is tenant-scoped (`404` for another tenant). Both
endpoints are audited.

### `POST /api/recommendations/{type}/{id}/snooze` — _Bearer_
Hide a recommendation until a future time. Provide **either** `days` **or** an explicit `until`
timestamp; with neither, it snoozes for 7 days. Snoozed items reappear automatically once `snoozedUntil`
passes.

Request _(optional body)_:

```json
{ "days": 30 }
```

or

```json
{ "until": "2026-08-01T12:00:00Z" }
```

Response `200 OK` (`RecommendationUpdateDto`):

```json
{
  "success": true,
  "type": "idle",
  "id": "88888888-1111-2222-3333-999999999999",
  "status": "SNOOZED",
  "snoozedUntil": "2026-07-18T06:17:00Z",
  "message": "Snoozed until 2026-07-18T06:17:00Z"
}
```

### `POST /api/recommendations/{type}/{id}/dismiss` — _Bearer_
Permanently dismiss a recommendation (it will not reappear on re-analysis). For `cleanup` this maps to
the candidate's `IGNORED` status; for `idle`/`rightsizing` it sets `DISMISSED`.

Response `200 OK` (`RecommendationUpdateDto`):

```json
{
  "success": true,
  "type": "rightsizing",
  "id": "cccccccc-1111-2222-3333-dddddddddddd",
  "status": "DISMISSED",
  "snoozedUntil": null,
  "message": "Recommendation dismissed"
}
```

---

## Alerts & settings

### `GET /api/settings/alerts` — _Bearer_
Fetch the user's alert configuration. Secrets (e.g. webhook URL) are masked.

Response `200 OK`:

```json
{
  "slackEnabled": true,
  "slackWebhookUrlMasked": "https://hooks.slack.com/services/****",
  "emailEnabled": true,
  "emailRecipients": ["ops@example.com"],
  "notifyOnNewWaste": true,
  "notifyOnSavings": true,
  "minSeverity": "MEDIUM",
  "digestFrequency": "DAILY"
}
```

### `PUT /api/settings/alerts` — _Bearer_
Update the alert configuration.

Request:

```json
{
  "slackEnabled": true,
  "slackWebhookUrl": "https://hooks.slack.com/services/T000/B000/XXXX",
  "emailEnabled": true,
  "emailRecipients": ["ops@example.com"],
  "notifyOnNewWaste": true,
  "notifyOnSavings": true,
  "minSeverity": "MEDIUM",
  "digestFrequency": "DAILY"
}
```

Response `200 OK`: the updated settings (masked), same shape as the `GET`.

### `POST /api/alerts/test-slack` — _Bearer_
Send a test Slack message using the saved (or provided) webhook.

Response `200 OK`:

```json
{ "success": true, "message": "Test message sent to Slack" }
```

### `POST /api/alerts/test-email` — _Bearer_
Send a test email. No-ops gracefully (success with a note) if SMTP is not configured.

Response `200 OK`:

```json
{ "success": true, "message": "Test email sent to ops@example.com" }
```

---

## Logs

### `GET /api/logs/actions` — _Bearer_
Audit log of **every** action (dry-run and real): cleanup, Resources-drawer and bulk actions
(`START`/`STOP`/`RESTART`/`RESIZE`/`ADD_TAGS`/`TERMINATE`/…), recommendation **applies**, and
snooze/dismiss.

Response `200 OK`:

```json
[
  {
    "id": "77777777-aaaa-bbbb-cccc-888888888888",
    "actionType": "DELETE_VOLUME",
    "resourceId": "33333333-dddd-eeee-ffff-444444444444",
    "provider": "AWS",
    "dryRun": true,
    "success": true,
    "message": "Dry-run: volume vol-0a1b2c3d4e5f6 would be deleted",
    "createdAt": "2026-06-18T06:18:00Z"
  }
]
```

### `GET /api/logs/sync` — _Bearer_
Sync history (see also `GET /api/sync/jobs`).

Response `200 OK`:

```json
[
  {
    "id": "9c9c9c9c-1234-5678-9abc-def012345678",
    "cloudAccountId": "11111111-aaaa-bbbb-cccc-222222222222",
    "provider": "AWS",
    "status": "SUCCESS",
    "resourcesDiscovered": 142,
    "startedAt": "2026-06-18T06:15:00Z",
    "finishedAt": "2026-06-18T06:15:42Z"
  }
]
```

### `GET /api/logs/alerts` — _Bearer_
History of alerts that were sent.

Response `200 OK`:

```json
[
  {
    "id": "dddddddd-1111-2222-3333-eeeeeeeeeeee",
    "channel": "SLACK",
    "alertType": "NEW_WASTE",
    "severity": "MEDIUM",
    "message": "3 new unattached volumes detected (est. $54.20/mo)",
    "success": true,
    "createdAt": "2026-06-18T06:00:00Z"
  }
]
```

---

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — how these endpoints map to services and engines
- [SECURITY.md](SECURITY.md) — auth, tenant isolation, and cleanup safety details
