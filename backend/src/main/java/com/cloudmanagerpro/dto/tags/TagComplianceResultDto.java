package com.cloudmanagerpro.dto.tags;

import com.cloudmanagerpro.model.TagComplianceResult;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;

import java.util.List;
import java.util.UUID;

public record TagComplianceResultDto(
        UUID id,
        UUID resourceId,
        UUID cloudAccountId,
        Provider provider,
        ResourceType resourceType,
        String resourceName,
        String region,
        boolean compliant,
        int score,
        List<String> missingTags,
        List<String> invalidTags
) {
    public static TagComplianceResultDto from(TagComplianceResult r) {
        return new TagComplianceResultDto(
                r.getId(),
                r.getResourceId(),
                r.getCloudAccountId(),
                r.getProvider(),
                r.getResourceType(),
                r.getResourceName(),
                r.getRegion(),
                r.isCompliant(),
                r.getScore(),
                r.getMissingTags(),
                r.getInvalidTags());
    }
}
