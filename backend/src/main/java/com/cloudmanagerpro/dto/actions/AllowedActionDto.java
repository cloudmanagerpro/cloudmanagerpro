package com.cloudmanagerpro.dto.actions;

import com.cloudmanagerpro.model.enums.ActionType;

/**
 * A single action that is valid for a resource given its type and current state.
 * <ul>
 *   <li>{@code destructive} – irreversible (terminate/delete/release); frontend requires type-to-confirm.</li>
 *   <li>{@code requiresConfirmation} – show a confirmation dialog before executing.</li>
 *   <li>{@code requiresParams} – needs {@code params} ({@code RESIZE} → instanceType, {@code ADD_TAGS} → tags).</li>
 * </ul>
 */
public record AllowedActionDto(
        ActionType action,
        String label,
        boolean destructive,
        boolean requiresConfirmation,
        boolean requiresParams,
        String description
) {
}
