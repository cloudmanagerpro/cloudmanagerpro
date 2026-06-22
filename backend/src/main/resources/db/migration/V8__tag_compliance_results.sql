create table tag_compliance_results (
    id               uuid primary key,
    user_id          uuid        not null,
    resource_id      uuid,
    cloud_account_id uuid,
    provider         varchar(16) not null,
    resource_type    varchar(32),
    resource_name    varchar(255),
    region           varchar(64),
    compliant        boolean     not null default false,
    score            integer     not null default 0,
    missing_tags     jsonb,
    invalid_tags     jsonb,
    present_tags     jsonb,
    evaluated_at     timestamptz,
    created_at       timestamptz not null,
    updated_at       timestamptz not null
);
