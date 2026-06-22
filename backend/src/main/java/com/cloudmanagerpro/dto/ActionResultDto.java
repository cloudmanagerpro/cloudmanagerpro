package com.cloudmanagerpro.dto;

import com.cloudmanagerpro.model.enums.ActionType;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Uniform result of a resource/cleanup action (dry-run or execute).
 *
 * <p>Field semantics:
 * <ul>
 *   <li>{@code success} – the request was handled without error (a simulated action is a success).</li>
 *   <li>{@code executed} – a real mutation was performed against the cloud (only when
 *       {@code providerMode == REAL} and it succeeded).</li>
 *   <li>{@code dryRun} – this was a preview; nothing was mutated.</li>
 *   <li>{@code simulated} – the action was simulated rather than executed for real
 *       ({@code providerMode == SIMULATED}: demo mode, real actions disabled, or Azure/GCP).</li>
 *   <li>{@code providerMode} – {@code "REAL"} or {@code "SIMULATED"} for this resource's account.</li>
 *   <li>{@code status} – outcome label: {@code DRY_RUN}, {@code EXECUTED}, {@code SIMULATED},
 *       {@code FAILED}, or an entity status for cleanup candidates.</li>
 *   <li>{@code estimatedMonthlySavings}, {@code fromType}, {@code toType} – optional preview hints,
 *       populated for {@code RESIZE} (current → target instance type and the projected saving) and
 *       {@code null} for every other action; clients must treat them as nullable.</li>
 * </ul>
 */
public record ActionResultDto(
        boolean success,
        boolean executed,
        boolean dryRun,
        boolean simulated,
        String providerMode,
        ActionType action,
        String status,
        UUID resourceId,
        String resourceName,
        String message,
        BigDecimal estimatedMonthlySavings,
        String fromType,
        String toType
) {
    /** Backwards-compatible constructor for results without the optional resize preview hints. */
    public ActionResultDto(boolean success, boolean executed, boolean dryRun, boolean simulated,
                           String providerMode, ActionType action, String status, UUID resourceId,
                           String resourceName, String message) {
        this(success, executed, dryRun, simulated, providerMode, action, status, resourceId,
                resourceName, message, null, null, null);
    }
}
