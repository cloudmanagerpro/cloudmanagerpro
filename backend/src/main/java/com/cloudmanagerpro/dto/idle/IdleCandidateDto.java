package com.cloudmanagerpro.dto.idle;

import com.cloudmanagerpro.model.IdleCandidate;
import com.cloudmanagerpro.model.enums.IdleReason;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.Severity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record IdleCandidateDto(
        UUID id,
        UUID resourceId,
        UUID cloudAccountId,
        Provider provider,
        ResourceType resourceType,
        IdleReason reason,
        Severity severity,
        Double cpuUtilization,
        BigDecimal estimatedMonthlySavings,
        OffsetDateTime idleSince,
        String region,
        String resourceName,
        OffsetDateTime detectedAt
) {
    public static IdleCandidateDto from(IdleCandidate c) {
        return new IdleCandidateDto(
                c.getId(),
                c.getResourceId(),
                c.getCloudAccountId(),
                c.getProvider(),
                c.getResourceType(),
                c.getReason(),
                c.getSeverity(),
                c.getCpuUtilization(),
                c.getEstimatedMonthlySavings(),
                c.getIdleSince(),
                c.getRegion(),
                c.getResourceName(),
                c.getDetectedAt());
    }
}
