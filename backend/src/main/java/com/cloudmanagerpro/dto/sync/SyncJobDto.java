package com.cloudmanagerpro.dto.sync;

import com.cloudmanagerpro.model.SyncJob;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.SyncStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SyncJobDto(
        UUID id,
        UUID cloudAccountId,
        Provider provider,
        SyncStatus status,
        String triggerType,
        OffsetDateTime startedAt,
        OffsetDateTime finishedAt,
        int resourcesSynced,
        int resourcesAdded,
        int resourcesUpdated,
        int resourcesRemoved,
        Long durationMs,
        String errorMessage,
        OffsetDateTime createdAt
) {
    public static SyncJobDto from(SyncJob job) {
        return new SyncJobDto(
                job.getId(),
                job.getCloudAccountId(),
                job.getProvider(),
                job.getStatus(),
                job.getTriggerType(),
                job.getStartedAt(),
                job.getFinishedAt(),
                job.getResourcesSynced(),
                job.getResourcesAdded(),
                job.getResourcesUpdated(),
                job.getResourcesRemoved(),
                job.getDurationMs(),
                job.getErrorMessage(),
                job.getCreatedAt());
    }
}
