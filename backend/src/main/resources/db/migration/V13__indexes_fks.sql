-- Foreign keys (tenant + ownership graph). Cascades keep child rows consistent on deletes.
alter table cloud_accounts
    add constraint fk_cloud_accounts_user foreign key (user_id) references users (id) on delete cascade;

alter table cloud_resources
    add constraint fk_cloud_resources_user foreign key (user_id) references users (id) on delete cascade,
    add constraint fk_cloud_resources_account foreign key (cloud_account_id) references cloud_accounts (id) on delete cascade;

alter table sync_jobs
    add constraint fk_sync_jobs_user foreign key (user_id) references users (id) on delete cascade,
    add constraint fk_sync_jobs_account foreign key (cloud_account_id) references cloud_accounts (id) on delete cascade;

alter table cleanup_candidates
    add constraint fk_cleanup_user foreign key (user_id) references users (id) on delete cascade,
    add constraint fk_cleanup_account foreign key (cloud_account_id) references cloud_accounts (id) on delete cascade,
    add constraint fk_cleanup_resource foreign key (resource_id) references cloud_resources (id) on delete cascade;

alter table idle_candidates
    add constraint fk_idle_user foreign key (user_id) references users (id) on delete cascade,
    add constraint fk_idle_account foreign key (cloud_account_id) references cloud_accounts (id) on delete cascade,
    add constraint fk_idle_resource foreign key (resource_id) references cloud_resources (id) on delete cascade;

alter table cost_daily
    add constraint fk_cost_user foreign key (user_id) references users (id) on delete cascade,
    add constraint fk_cost_account foreign key (cloud_account_id) references cloud_accounts (id) on delete cascade;

alter table tag_compliance_results
    add constraint fk_tag_user foreign key (user_id) references users (id) on delete cascade,
    add constraint fk_tag_account foreign key (cloud_account_id) references cloud_accounts (id) on delete cascade,
    add constraint fk_tag_resource foreign key (resource_id) references cloud_resources (id) on delete cascade;

alter table rightsizing_recommendations
    add constraint fk_rightsizing_user foreign key (user_id) references users (id) on delete cascade,
    add constraint fk_rightsizing_account foreign key (cloud_account_id) references cloud_accounts (id) on delete cascade,
    add constraint fk_rightsizing_resource foreign key (resource_id) references cloud_resources (id) on delete cascade;

alter table alert_settings
    add constraint fk_alert_settings_user foreign key (user_id) references users (id) on delete cascade;

alter table alert_logs
    add constraint fk_alert_logs_user foreign key (user_id) references users (id) on delete cascade;

alter table action_logs
    add constraint fk_action_logs_user foreign key (user_id) references users (id) on delete cascade;

-- Tenant + lookup indexes
create index ix_cloud_accounts_user on cloud_accounts (user_id);

create index ix_cloud_resources_user on cloud_resources (user_id);
create index ix_cloud_resources_account on cloud_resources (cloud_account_id);
create index ix_cloud_resources_user_type on cloud_resources (user_id, resource_type);
create index ix_cloud_resources_user_waste on cloud_resources (user_id, waste_state);
create unique index ux_cloud_resources_account_external on cloud_resources (cloud_account_id, external_id);

create index ix_sync_jobs_user on sync_jobs (user_id);
create index ix_sync_jobs_account on sync_jobs (cloud_account_id);
create index ix_sync_jobs_user_created on sync_jobs (user_id, created_at desc);

create index ix_cleanup_user on cleanup_candidates (user_id);
create index ix_cleanup_user_status on cleanup_candidates (user_id, status);

create index ix_idle_user on idle_candidates (user_id);

create index ix_cost_user on cost_daily (user_id);
create index ix_cost_user_date on cost_daily (user_id, usage_date);

create index ix_tag_user on tag_compliance_results (user_id);

create index ix_rightsizing_user on rightsizing_recommendations (user_id);

create index ix_alert_logs_user_created on alert_logs (user_id, created_at desc);

create index ix_action_logs_user_created on action_logs (user_id, created_at desc);
