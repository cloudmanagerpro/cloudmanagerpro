package com.cloudmanagerpro.service.tags;

import com.cloudmanagerpro.dto.tags.TagComplianceResultDto;
import com.cloudmanagerpro.dto.tags.TagComplianceSummaryDto;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.TagComplianceResult;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import com.cloudmanagerpro.repository.TagComplianceResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Evaluates resources against the required tag policy and produces per-resource + aggregate scores. */
@Service
@RequiredArgsConstructor
public class TagComplianceService {

    private final CloudResourceRepository resourceRepository;
    private final TagComplianceResultRepository tagComplianceResultRepository;

    @Transactional
    public TagComplianceSummaryDto analyze(UUID userId) {
        tagComplianceResultRepository.deleteByUserId(userId);
        List<CloudResource> resources = resourceRepository.findByUserId(userId);
        List<TagComplianceResult> results = new ArrayList<>();
        for (CloudResource resource : resources) {
            results.add(evaluate(userId, resource));
        }
        tagComplianceResultRepository.saveAll(results);
        return summary(userId);
    }

    @Transactional(readOnly = true)
    public TagComplianceSummaryDto summary(UUID userId) {
        List<TagComplianceResult> results = tagComplianceResultRepository.findByUserId(userId);
        long total = results.size();
        long compliant = results.stream().filter(TagComplianceResult::isCompliant).count();
        int overallScore = results.isEmpty() ? 100
                : (int) Math.round(results.stream().mapToInt(TagComplianceResult::getScore).average().orElse(100));

        Map<String, Long> missingByTag = new LinkedHashMap<>();
        for (String tag : TagPolicy.REQUIRED_TAGS) {
            long count = results.stream().filter(r -> r.getMissingTags() != null && r.getMissingTags().contains(tag)).count();
            missingByTag.put(tag, count);
        }

        List<TagComplianceResultDto> dtos = results.stream()
                .sorted((a, b) -> Integer.compare(a.getScore(), b.getScore()))
                .map(TagComplianceResultDto::from)
                .toList();

        return new TagComplianceSummaryDto(total, compliant, total - compliant, overallScore,
                TagPolicy.REQUIRED_TAGS, missingByTag, dtos);
    }

    private TagComplianceResult evaluate(UUID userId, CloudResource resource) {
        Map<String, String> tags = resource.getTags() != null ? resource.getTags() : new HashMap<>();
        List<String> missing = TagPolicy.missingTags(tags);
        List<String> invalid = TagPolicy.invalidTags(tags);

        Map<String, String> present = new HashMap<>();
        for (String required : TagPolicy.REQUIRED_TAGS) {
            if (StringUtils.hasText(tags.get(required))) {
                present.put(required, tags.get(required));
            }
        }

        int required = TagPolicy.REQUIRED_TAGS.size();
        int compliantCount = Math.max(0, required - missing.size() - invalid.size());
        int score = (int) Math.round(100.0 * compliantCount / required);
        boolean compliant = missing.isEmpty() && invalid.isEmpty();

        TagComplianceResult result = new TagComplianceResult();
        result.setUserId(userId);
        result.setResourceId(resource.getId());
        result.setCloudAccountId(resource.getCloudAccountId());
        result.setProvider(resource.getProvider());
        result.setResourceType(resource.getResourceType());
        result.setResourceName(resource.getName());
        result.setRegion(resource.getRegion());
        result.setCompliant(compliant);
        result.setScore(score);
        result.setMissingTags(missing);
        result.setInvalidTags(invalid);
        result.setPresentTags(present);
        result.setEvaluatedAt(OffsetDateTime.now());
        return result;
    }
}
