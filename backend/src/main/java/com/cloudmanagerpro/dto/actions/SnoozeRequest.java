package com.cloudmanagerpro.dto.actions;

import java.time.OffsetDateTime;

/**
 * Optional body for {@code POST /recommendations/{type}/{id}/snooze}.
 * Provide either {@code days} (e.g. 7 or 30) or an explicit {@code until} timestamp.
 * When both are omitted the item is snoozed for 7 days.
 */
public record SnoozeRequest(
        Integer days,
        OffsetDateTime until
) {
}
