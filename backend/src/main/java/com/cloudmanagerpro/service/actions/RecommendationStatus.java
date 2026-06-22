package com.cloudmanagerpro.service.actions;

/**
 * String status values shared by the idle and rightsizing recommendation engines (stored as plain
 * varchar columns). Cleanup uses its own {@link com.cloudmanagerpro.model.enums.CleanupStatus} enum.
 */
public final class RecommendationStatus {

    public static final String OPEN = "OPEN";
    public static final String SNOOZED = "SNOOZED";
    public static final String DISMISSED = "DISMISSED";
    public static final String APPLIED = "APPLIED";

    private RecommendationStatus() {
    }
}
