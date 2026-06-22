package com.cloudmanagerpro.dto.actions;

import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.model.enums.ActionType;

import java.util.List;

/**
 * Response of the bulk action endpoints: an aggregate summary plus one {@link ActionResultDto} per
 * requested resource (in request order; unknown/cross-tenant ids appear as failed results).
 */
public record BulkActionResultDto(
        ActionType action,
        boolean dryRun,
        int total,
        int succeeded,
        int failed,
        int executed,
        int simulated,
        List<ActionResultDto> results
) {
}
