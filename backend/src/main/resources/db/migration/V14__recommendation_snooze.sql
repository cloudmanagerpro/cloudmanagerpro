-- Snooze / dismiss support across the recommendation engines.
-- idle_candidates gains a lifecycle status (OPEN/SNOOZED/DISMISSED) plus a snooze deadline;
-- rightsizing_recommendations already has a string status, so it only needs snoozed_until;
-- cleanup_candidates keeps its CleanupStatus enum (dismiss maps to IGNORED) and adds snoozed_until.

alter table idle_candidates
    add column status        varchar(16) not null default 'OPEN',
    add column snoozed_until timestamptz;

alter table rightsizing_recommendations
    add column snoozed_until timestamptz;

alter table cleanup_candidates
    add column snoozed_until timestamptz;

create index ix_idle_user_status on idle_candidates (user_id, status);
