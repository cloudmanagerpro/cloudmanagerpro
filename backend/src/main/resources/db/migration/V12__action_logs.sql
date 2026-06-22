create table action_logs (
    id                   uuid primary key,
    user_id              uuid        not null,
    resource_id          uuid,
    cloud_account_id     uuid,
    action_type          varchar(32) not null,
    action               varchar(64),
    resource_type        varchar(32),
    resource_name        varchar(255),
    resource_external_id varchar(255),
    provider             varchar(16),
    dry_run              boolean     not null default true,
    success              boolean     not null default false,
    result_message       text,
    estimated_savings    numeric(18,4) default 0,
    created_at           timestamptz not null
);
