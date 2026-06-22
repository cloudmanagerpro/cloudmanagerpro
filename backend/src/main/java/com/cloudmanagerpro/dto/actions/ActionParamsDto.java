package com.cloudmanagerpro.dto.actions;

import java.util.Map;

/**
 * Optional parameters for a resource action.
 * <ul>
 *   <li>{@code instanceType} – target type for {@code RESIZE} (e.g. {@code "t3.medium"}).</li>
 *   <li>{@code tags} – key/value pairs for {@code ADD_TAGS}.</li>
 * </ul>
 */
public record ActionParamsDto(
        String instanceType,
        Map<String, String> tags
) {
}
