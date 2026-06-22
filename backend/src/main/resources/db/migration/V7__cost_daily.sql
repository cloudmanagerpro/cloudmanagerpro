create table cost_daily (
    id               uuid primary key,
    user_id          uuid        not null,
    cloud_account_id uuid,
    provider         varchar(16) not null,
    usage_date       date        not null,
    service          varchar(128),
    region           varchar(64),
    amount           numeric(18,4) not null default 0,
    currency         varchar(8) default 'USD',
    created_at       timestamptz not null
);
