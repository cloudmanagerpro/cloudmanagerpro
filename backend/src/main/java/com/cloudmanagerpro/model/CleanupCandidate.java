package com.cloudmanagerpro.model;

import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.CleanupStatus;
import com.cloudmanagerpro.model.enums.CleanupType;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.Severity;
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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "cleanup_candidates")
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CleanupCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "resource_id")
    private UUID resourceId;

    @Column(name = "cloud_account_id")
    private UUID cloudAccountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Provider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", length = 32)
    private ResourceType resourceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "candidate_type", nullable = false, length = 32)
    private CleanupType candidateType;

    @Column(columnDefinition = "text")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Severity severity = Severity.LOW;

    @Column(name = "estimated_monthly_savings", precision = 18, scale = 4)
    private BigDecimal estimatedMonthlySavings = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CleanupStatus status = CleanupStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommended_action", length = 32)
    private ActionType recommendedAction = ActionType.NONE;

    @Column(length = 64)
    private String region;

    @Column(name = "resource_name")
    private String resourceName;

    @Column(name = "resource_external_id")
    private String resourceExternalId;

    @Column(name = "snoozed_until")
    private OffsetDateTime snoozedUntil;

    @Column(name = "detected_at")
    private OffsetDateTime detectedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
