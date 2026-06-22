package com.cloudmanagerpro.dto.rightsizing;

import com.cloudmanagerpro.model.RightsizingRecommendation;
import com.cloudmanagerpro.model.enums.Confidence;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;

import java.math.BigDecimal;
import java.util.UUID;

public record RightsizingDto(
        UUID id,
        UUID resourceId,
        UUID cloudAccountId,
        Provider provider,
        ResourceType resourceType,
        String resourceName,
        String region,
        String currentType,
        String recommendedType,
        BigDecimal currentMonthlyCost,
        BigDecimal projectedMonthlyCost,
        BigDecimal estimatedMonthlySavings,
        Double avgCpuUtilization,
        Double maxCpuUtilization,
        Confidence confidence,
        String reason,
        int lookbackDays,
        String status
) {
    public static RightsizingDto from(RightsizingRecommendation r) {
        return new RightsizingDto(
                r.getId(),
                r.getResourceId(),
                r.getCloudAccountId(),
                r.getProvider(),
                r.getResourceType(),
                r.getResourceName(),
                r.getRegion(),
                r.getCurrentType(),
                r.getRecommendedType(),
                r.getCurrentMonthlyCost(),
                r.getProjectedMonthlyCost(),
                r.getEstimatedMonthlySavings(),
                r.getAvgCpuUtilization(),
                r.getMaxCpuUtilization(),
                r.getConfidence(),
                r.getReason(),
                r.getLookbackDays(),
                r.getStatus());
    }
}
