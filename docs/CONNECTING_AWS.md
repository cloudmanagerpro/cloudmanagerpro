# Connecting a real AWS account

CloudManagerPro syncs **real** AWS data as soon as an account has credentials — independent of the
`ENABLE_DEMO_DATA` flag. An account is treated as **real** when it has either:

- an **access key + secret key**, or
- an **IAM role ARN** to assume (optionally with an external ID).

For a real account the app **always** calls the real AWS APIs for sync, cost and metrics. If a call
fails (bad credentials, missing IAM permission, wrong region, network), the sync is recorded as
**FAILED** with the AWS error message and the account status becomes **ERROR** — it is **never**
silently replaced with demo data. Demo data is only produced for accounts that have *no* credentials.

> Destructive actions (stop/terminate/delete/resize/release) remain disabled unless
> `ENABLE_REAL_CLOUD_ACTIONS=true`. **Read-only sync is not gated by that flag.**

## Required IAM read permissions

Attach this **read-only** policy to the IAM user (for access keys) or the IAM role (for role ARN):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudManagerProReadOnly",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeAddresses",
        "ec2:DescribeSnapshots",
        "rds:DescribeDBInstances",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:GetMetricData",
        "ce:GetCostAndUsage"
      ],
      "Resource": "*"
    }
  ]
}
```

What each permission powers:

| Permission | Used for |
|---|---|
| `sts:GetCallerIdentity` | "Test connection" + resolving the AWS account id |
| `ec2:DescribeInstances` / `DescribeVolumes` / `DescribeAddresses` / `DescribeSnapshots` | EC2 instances, EBS volumes, Elastic IPs, snapshots |
| `rds:DescribeDBInstances` | RDS database instances |
| `s3:ListAllMyBuckets` (a.k.a. `s3:ListBuckets`) + `s3:GetBucketLocation` | S3 buckets and their region |
| `cloudwatch:GetMetricStatistics` / `GetMetricData` | EC2/RDS CPU utilization and S3 bucket size (cost estimate) |
| `ce:GetCostAndUsage` | Daily cost by service (Cost Explorer must be enabled in the account) |

Notes:
- Cost Explorer (`ce:*`) is only available in **us-east-1**; the app already calls it there.
- CloudWatch metrics and S3 size are **best-effort** — if they are denied, the rest of the sync still
  succeeds (CPU/size just show as 0). The describe/list calls above are required.

### Cross-account role (instead of access keys)

If you connect a role ARN, the platform's base identity must be allowed to assume it. The role's trust
policy should allow your platform principal and (recommended) require the external ID you enter in the
UI. The platform calls `sts:AssumeRole` with that external ID.

## How to connect / re-sync to see your real data

1. **Remove demo accounts** (optional): delete the demo *AWS Production / Azure Dev / GCP Analytics*
   accounts. Deleting an account cascades and removes all of its resources, costs, candidates and
   recommendations.
2. **Add your AWS account** with access keys *or* a role ARN and the correct default region. On create,
   the app runs a connection test and an initial sync automatically.
3. **Re-sync at any time** — this is the key step if data looks stale:
   - In the UI: open the account and click **Sync now** (or **Test connection** first).
   - Via API: `POST /api/sync/{cloudAccountId}` or `POST /api/cloud-accounts/{id}/sync`.
   - A manual sync reconciles resources (anything no longer in AWS is removed), refreshes the last
     90 days of real costs, re-runs the optimization engines, and clears any leftover demo rows from
     deleted accounts.
4. **Check the result**: `GET /api/sync/jobs` (or the account's status). A real failure shows
   `status = FAILED`, the account `connectionStatus = ERROR`, and a descriptive `lastError`
   (e.g. *"AWS sync failed: ... not authorized to perform: ec2:DescribeInstances ..."*). Fix the IAM
   permission or credentials and sync again.

## What gets synced

| Category | Resource type | Source call |
|---|---|---|
| EC2 | `EC2_INSTANCE` | `ec2:DescribeInstances` |
| EBS | `EBS_VOLUME` | `ec2:DescribeVolumes` |
| Elastic IP | `ELASTIC_IP` | `ec2:DescribeAddresses` |
| Snapshot | `SNAPSHOT` | `ec2:DescribeSnapshots` (owner = self) |
| RDS | `RDS_INSTANCE` | `rds:DescribeDBInstances` |
| S3 | `S3_BUCKET` | `s3:ListAllMyBuckets` + `s3:GetBucketLocation` |

Each resource carries its `resourceType` plus a `service` label in metadata (EC2, EBS, Elastic IP,
Snapshot, RDS, S3) so the dashboard can group the inventory by category.
