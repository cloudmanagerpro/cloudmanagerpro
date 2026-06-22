package com.cloudmanagerpro.dto.logs;

import com.cloudmanagerpro.model.ActionLog;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ActionLogDto(
        UUID id,
        UUID resourceId,
        UUID cloudAccountId,
        ActionType actionType,
        String action,
        ResourceType resourceType,
        String resourceName,
        String resourceExternalId,
        Provider provider,
        boolean dryRun,
        boolean success,
        String resultMessage,
        BigDecimal estimatedSavings,
        OffsetDateTime createdAt
) {
    public static ActionLogDto from(ActionLog log) {
        return new ActionLogDto(
                log.getId(),
                log.getResourceId(),
                log.getCloudAccountId(),
                log.getActionType(),
                log.getAction(),
                log.getResourceType(),
                log.getResourceName(),
                log.getResourceExternalId(),
                log.getProvider(),
                log.isDryRun(),
                log.isSuccess(),
                log.getResultMessage(),
                log.getEstimatedSavings(),
                log.getCreatedAt());
    }
}
