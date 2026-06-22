package com.cloudmanagerpro.service.tags;

import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Organisation tagging policy: required keys and the allowed values for constrained tags. */
public final class TagPolicy {

    public static final List<String> REQUIRED_TAGS = List.of("owner", "environment", "project", "cost_center");

    public static final Set<String> VALID_ENVIRONMENTS = Set.of("dev", "staging", "production", "test");

    private TagPolicy() {
    }

    public static List<String> missingTags(Map<String, String> tags) {
        List<String> missing = new ArrayList<>();
        for (String required : REQUIRED_TAGS) {
            if (tags == null || !StringUtils.hasText(tags.get(required))) {
                missing.add(required);
            }
        }
        return missing;
    }

    public static List<String> invalidTags(Map<String, String> tags) {
        List<String> invalid = new ArrayList<>();
        if (tags == null) {
            return invalid;
        }
        String environment = tags.get("environment");
        if (StringUtils.hasText(environment) && !VALID_ENVIRONMENTS.contains(environment.toLowerCase())) {
            invalid.add("environment");
        }
        return invalid;
    }

    public static boolean hasAnyOwnership(Map<String, String> tags) {
        return tags != null
                && (StringUtils.hasText(tags.get("owner")) || StringUtils.hasText(tags.get("project")));
    }
}
