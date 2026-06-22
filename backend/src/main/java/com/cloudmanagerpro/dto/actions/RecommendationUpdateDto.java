package com.cloudmanagerpro.dto.actions;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response of {@code POST /recommendations/{type}/{id}/snooze} and {@code .../dismiss}.
 * {@code status} is the recommendation's resulting state ({@code SNOOZED}, {@code DISMISSED}, or
 * {@code IGNORED} for cleanup dismiss); {@code snoozedUntil} is set only when snoozing.
 */
public record RecommendationUpdateDto(
        boolean success,
        String type,
        UUID id,
        String status,
        OffsetDateTime snoozedUntil,
        String message
) {
}
