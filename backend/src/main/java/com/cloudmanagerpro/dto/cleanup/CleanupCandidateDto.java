package com.cloudmanagerpro.dto.cleanup;

import com.cloudmanagerpro.model.CleanupCandidate;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.CleanupStatus;
import com.cloudmanagerpro.model.enums.CleanupType;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.Severity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CleanupCandidateDto(
        UUID id,
        UUID resourceId,
        UUID cloudAccountId,
        Provider provider,
        ResourceType resourceType,
        CleanupType candidateType,
        String reason,
        Severity severity,
        BigDecimal estimatedMonthlySavings,
        CleanupStatus status,
        ActionType recommendedAction,
        String region,
        String resourceName,
        String resourceExternalId,
        OffsetDateTime detectedAt
) {
    public static CleanupCandidateDto from(CleanupCandidate c) {
        return new CleanupCandidateDto(
                c.getId(),
                c.getResourceId(),
                c.getCloudAccountId(),
                c.getProvider(),
                c.getResourceType(),
                c.getCandidateType(),
                c.getReason(),
                c.getSeverity(),
                c.getEstimatedMonthlySavings(),
                c.getStatus(),
                c.getRecommendedAction(),
                c.getRegion(),
                c.getResourceName(),
                c.getResourceExternalId(),
                c.getDetectedAt());
    }
}
