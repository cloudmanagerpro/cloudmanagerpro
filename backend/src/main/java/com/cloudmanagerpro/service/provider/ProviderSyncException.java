package com.cloudmanagerpro.service.provider;

/**
 * Raised when a real cloud sync/cost call fails for an account that has real credentials.
 *
 * <p>This is intentionally <em>not</em> swallowed by a demo-data fallback: the orchestration layer
 * records the failure (FAILED {@code SyncJob}, account status {@code ERROR}, {@code lastError}) so the
 * user can see that their real connection failed (bad credentials, missing IAM permission, wrong
 * region, network, ...) instead of being silently shown synthetic demo data.
 */
public class ProviderSyncException extends RuntimeException {

    public ProviderSyncException(String message) {
        super(message);
    }

    public ProviderSyncException(String message, Throwable cause) {
        super(message, cause);
    }
}
