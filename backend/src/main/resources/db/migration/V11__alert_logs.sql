create table alert_logs (
    id            uuid primary key,
    user_id       uuid        not null,
    alert_type    varchar(32) not null,
    channel       varchar(16) not null,
    subject       varchar(255),
    message       text,
    success       boolean     not null default false,
    error_message text,
    sent_at       timestamptz,
    created_at    timestamptz not null
);
