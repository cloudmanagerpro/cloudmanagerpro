create table idle_candidates (
    id                        uuid primary key,
    user_id                   uuid        not null,
    resource_id               uuid,
    cloud_account_id          uuid,
    provider                  varchar(16) not null,
    resource_type             varchar(32),
    reason                    varchar(16) not null,
    severity                  varchar(16) not null default 'LOW',
    cpu_utilization           double precision,
    estimated_monthly_savings numeric(18,4) default 0,
    idle_since                timestamptz,
    region                    varchar(64),
    resource_name             varchar(255),
    detected_at               timestamptz,
    created_at                timestamptz not null,
    updated_at                timestamptz not null
);
