create table sync_jobs (
    id                uuid primary key,
    user_id           uuid        not null,
    cloud_account_id  uuid        not null,
    provider          varchar(16) not null,
    status            varchar(16) not null default 'PENDING',
    trigger_type      varchar(16),
    started_at        timestamptz,
    finished_at       timestamptz,
    resources_synced  integer     not null default 0,
    resources_added   integer     not null default 0,
    resources_updated integer     not null default 0,
    resources_removed integer     not null default 0,
    duration_ms       bigint,
    error_message     text,
    created_at        timestamptz not null
);
