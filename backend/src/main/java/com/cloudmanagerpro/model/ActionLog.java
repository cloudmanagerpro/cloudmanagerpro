package com.cloudmanagerpro.model;

import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "action_logs")
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ActionLog {

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
    @Column(name = "action_type", nullable = false, length = 32)
    private ActionType actionType;

    @Column(length = 64)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", length = 32)
    private ResourceType resourceType;

    @Column(name = "resource_name")
    private String resourceName;

    @Column(name = "resource_external_id")
    private String resourceExternalId;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private Provider provider;

    @Column(name = "dry_run", nullable = false)
    private boolean dryRun = true;

    @Column(nullable = false)
    private boolean success = false;

    @Column(name = "result_message", columnDefinition = "text")
    private String resultMessage;

    @Column(name = "estimated_savings", precision = 18, scale = 4)
    private BigDecimal estimatedSavings = BigDecimal.ZERO;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
