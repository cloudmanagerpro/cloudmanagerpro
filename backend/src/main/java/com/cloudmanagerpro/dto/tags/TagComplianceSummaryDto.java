package com.cloudmanagerpro.dto.tags;

import java.util.List;
import java.util.Map;

public record TagComplianceSummaryDto(
        long totalResources,
        long compliantResources,
        long nonCompliantResources,
        int overallScore,
        List<String> requiredTags,
        Map<String, Long> missingByTag,
        List<TagComplianceResultDto> results
) {
}
