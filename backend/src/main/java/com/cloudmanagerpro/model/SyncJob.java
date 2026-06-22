package com.cloudmanagerpro.model;

import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.SyncStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "sync_jobs")
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class SyncJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "cloud_account_id", nullable = false)
    private UUID cloudAccountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Provider provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SyncStatus status = SyncStatus.PENDING;

    /** MANUAL or SCHEDULED. */
    @Column(name = "trigger_type", length = 16)
    private String triggerType;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "finished_at")
    private OffsetDateTime finishedAt;

    @Column(name = "resources_synced", nullable = false)
    private int resourcesSynced = 0;

    @Column(name = "resources_added", nullable = false)
    private int resourcesAdded = 0;

    @Column(name = "resources_updated", nullable = false)
    private int resourcesUpdated = 0;

    @Column(name = "resources_removed", nullable = false)
    private int resourcesRemoved = 0;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
