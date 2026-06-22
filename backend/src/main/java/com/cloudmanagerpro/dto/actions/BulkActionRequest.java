package com.cloudmanagerpro.dto.actions;

import com.cloudmanagerpro.model.enums.ActionType;

import java.util.List;
import java.util.UUID;

/**
 * Body for {@code POST /actions/bulk/dry-run} and {@code .../execute}.
 * Example: {@code { "resourceIds": ["..."], "action": "STOP", "confirmation": "DELETE" }}.
 * For destructive bulk actions with real cloud actions enabled, {@code confirmation} must be the
 * literal {@code "DELETE"} (per-resource name confirmation is only available on single-resource actions).
 */
public record BulkActionRequest(
        List<UUID> resourceIds,
        ActionType action,
        ActionParamsDto params,
        String confirmation
) {
}
