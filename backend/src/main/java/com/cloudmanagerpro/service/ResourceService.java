package com.cloudmanagerpro.service;

import com.cloudmanagerpro.dto.resource.ResourceDto;
import com.cloudmanagerpro.dto.resource.ResourceFilter;
import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final CloudResourceRepository resourceRepository;

    @Transactional(readOnly = true)
    public List<ResourceDto> search(UUID userId, ResourceFilter filter) {
        List<CloudResource> resources = resourceRepository.findAll(
                CloudResourceSpecifications.withFilter(userId, filter),
                Sort.by(Sort.Direction.DESC, "monthlyCost"));
        return resources.stream()
                .filter(resource -> matchesTag(resource, filter))
                .map(ResourceDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResourceDto get(UUID userId, UUID id) {
        CloudResource resource = resourceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        return ResourceDto.from(resource);
    }

    /** jsonb tag filtering is applied in-memory: {@code tag=key} or {@code tag=key:value}. */
    private boolean matchesTag(CloudResource resource, ResourceFilter filter) {
        if (filter == null || !StringUtils.hasText(filter.tag())) {
            return true;
        }
        Map<String, String> tags = resource.getTags();
        if (tags == null || tags.isEmpty()) {
            return false;
        }
        String raw = filter.tag();
        int separator = raw.indexOf(':');
        if (separator < 0) {
            separator = raw.indexOf('=');
        }
        if (separator >= 0) {
            String key = raw.substring(0, separator).trim();
            String value = raw.substring(separator + 1).trim();
            return value.equalsIgnoreCase(tags.get(key));
        }
        return tags.containsKey(raw.trim());
    }
}
