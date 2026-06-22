package com.cloudmanagerpro.dto.actions;

import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;

import java.util.List;
import java.util.UUID;

/**
 * Response of {@code GET /resources/{id}/actions}: the actions allowed for this resource plus the
 * {@code providerMode} ({@code "REAL"}/{@code "SIMULATED"}) the frontend uses to label/disable controls.
 */
public record ResourceActionsDto(
        UUID resourceId,
        Provider provider,
        ResourceType resourceType,
        String status,
        String providerMode,
        List<AllowedActionDto> actions
) {
}
