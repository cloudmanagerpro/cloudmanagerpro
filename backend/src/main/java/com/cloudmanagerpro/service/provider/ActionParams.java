package com.cloudmanagerpro.service.provider;

import java.util.Map;

/**
 * Optional parameters that accompany a resource action. Only the fields relevant to a given
 * {@link com.cloudmanagerpro.model.enums.ActionType} are populated:
 * <ul>
 *   <li>{@code instanceType} – target type for {@code RESIZE}</li>
 *   <li>{@code tags} – key/value pairs for {@code ADD_TAGS}</li>
 * </ul>
 */
public record ActionParams(
        String instanceType,
        Map<String, String> tags
) {
    public ActionParams {
        tags = tags == null ? Map.of() : tags;
    }

    public static ActionParams empty() {
        return new ActionParams(null, Map.of());
    }

    public static ActionParams ofInstanceType(String instanceType) {
        return new ActionParams(instanceType, Map.of());
    }

    public static ActionParams ofTags(Map<String, String> tags) {
        return new ActionParams(null, tags);
    }
}
