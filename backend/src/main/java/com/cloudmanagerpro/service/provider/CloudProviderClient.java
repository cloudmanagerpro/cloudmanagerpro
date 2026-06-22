package com.cloudmanagerpro.service.provider;

import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.CostDaily;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.Provider;

import java.time.LocalDate;
import java.util.List;

/**
 * Uniform abstraction over cloud providers. When an account carries real credentials (see
 * {@link #isRealAccount(CloudAccount)}) implementations ALWAYS attempt real provider API calls —
 * regardless of the global {@code ENABLE_DEMO_DATA} flag — and surface failures by throwing
 * {@link ProviderSyncException} rather than silently substituting demo data. Demo data is produced
 * only for credential-less / demo accounts.
 *
 * <p>Returned {@link CloudResource} and {@link CostDaily} objects are transient (no user/account id
 * required to be set); the sync layer assigns tenancy and performs the upsert/reconcile.
 */
public interface CloudProviderClient {

    Provider provider();

    /**
     * Whether this account is backed by real cloud credentials (role ARN or access/secret keys) and
     * should therefore sync real data. Demo-only providers and credential-less accounts return
     * {@code false}. This is independent of the global {@code ENABLE_DEMO_DATA} flag.
     */
    default boolean isRealAccount(CloudAccount account) {
        return false;
    }

    ConnectionTestResult testConnection(CloudAccount account);

    /**
     * Lists resources for the account. For a {@link #isRealAccount(CloudAccount) real} account this
     * performs real provider describe/list calls and throws {@link ProviderSyncException} on failure
     * (never falls back to demo data); for a credential-less account it returns demo resources.
     */
    List<CloudResource> syncResources(CloudAccount account);

    List<CostDaily> fetchCostData(CloudAccount account, LocalDate start, LocalDate end);

    ResourceMetrics fetchMetrics(CloudAccount account, CloudResource resource);

    /**
     * Whether a non-dry-run {@code executeAction} against this account would hit the real cloud
     * ({@link ProviderMode#REAL}) or be simulated ({@link ProviderMode#SIMULATED}). Reflects the
     * two-layer gate (global {@code ENABLE_REAL_CLOUD_ACTIONS} + per-account credentials/demo mode).
     */
    ProviderMode actionMode(CloudAccount account);

    /**
     * Performs (or simulates) a resource action. Implementations honour the safety gate: when real
     * actions are disabled or the account is in demo mode, they return a clearly-labelled simulated
     * result instead of mutating the cloud. Dry-runs never mutate.
     */
    ActionResult executeAction(CloudAccount account, CloudResource resource, ActionType action,
                               ActionParams params, boolean dryRun);

    /** Convenience overload for callers without parameters (e.g. cleanup). */
    default ActionResult executeAction(CloudAccount account, CloudResource resource, ActionType action,
                                       boolean dryRun) {
        return executeAction(account, resource, action, ActionParams.empty(), dryRun);
    }
}
