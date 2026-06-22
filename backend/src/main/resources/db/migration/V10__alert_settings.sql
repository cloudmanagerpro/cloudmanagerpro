create table alert_settings (
    id                      uuid primary key,
    user_id                 uuid    not null,
    email_enabled           boolean not null default false,
    slack_enabled           boolean not null default false,
    encrypted_slack_webhook text,
    email_recipients        text,
    cost_spike_threshold    numeric(18,4) default 20.00,
    idle_alerts_enabled     boolean not null default true,
    cleanup_alerts_enabled  boolean not null default true,
    digest_enabled          boolean not null default true,
    digest_frequency        varchar(16) default 'DAILY',
    created_at              timestamptz not null,
    updated_at              timestamptz not null
);

create unique index ux_alert_settings_user on alert_settings (user_id);
