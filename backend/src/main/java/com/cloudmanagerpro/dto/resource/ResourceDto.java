package com.cloudmanagerpro.dto.resource;

import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.WasteState;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record ResourceDto(
        UUID id,
        UUID cloudAccountId,
        Provider provider,
        ResourceType resourceType,
        String externalId,
        String name,
        String region,
        String status,
        String instanceType,
        Integer sizeGb,
        Double cpuUtilization,
        Double networkInBytes,
        Double diskIoBytes,
        BigDecimal monthlyCost,
        WasteState wasteState,
        Map<String, String> tags,
        Map<String, Object> metadata,
        OffsetDateTime lastActivityAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static ResourceDto from(CloudResource r) {
        return new ResourceDto(
                r.getId(),
                r.getCloudAccountId(),
                r.getProvider(),
                r.getResourceType(),
                r.getExternalId(),
                r.getName(),
                r.getRegion(),
                r.getStatus(),
                r.getInstanceType(),
                r.getSizeGb(),
                r.getCpuUtilization(),
                r.getNetworkInBytes(),
                r.getDiskIoBytes(),
                r.getMonthlyCost(),
                r.getWasteState(),
                r.getTags(),
                r.getMetadata(),
                r.getLastActivityAt(),
                r.getCreatedAt(),
                r.getUpdatedAt());
    }
}
