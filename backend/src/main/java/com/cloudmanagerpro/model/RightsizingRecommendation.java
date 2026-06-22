package com.cloudmanagerpro.model;

import com.cloudmanagerpro.model.enums.Confidence;
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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "rightsizing_recommendations")
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class RightsizingRecommendation {

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

    @Column(name = "resource_name")
    private String resourceName;

    @Column(length = 64)
    private String region;

    @Column(name = "current_type", length = 64)
    private String currentType;

    @Column(name = "recommended_type", length = 64)
    private String recommendedType;

    @Column(name = "current_monthly_cost", precision = 18, scale = 4)
    private BigDecimal currentMonthlyCost = BigDecimal.ZERO;

    @Column(name = "projected_monthly_cost", precision = 18, scale = 4)
    private BigDecimal projectedMonthlyCost = BigDecimal.ZERO;

    @Column(name = "estimated_monthly_savings", precision = 18, scale = 4)
    private BigDecimal estimatedMonthlySavings = BigDecimal.ZERO;

    @Column(name = "avg_cpu_utilization")
    private Double avgCpuUtilization;

    @Column(name = "max_cpu_utilization")
    private Double maxCpuUtilization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Confidence confidence = Confidence.LOW;

    @Column(columnDefinition = "text")
    private String reason;

    @Column(name = "lookback_days", nullable = false)
    private int lookbackDays = 14;

    @Column(length = 16)
    private String status = "OPEN";

    @Column(name = "snoozed_until")
    private OffsetDateTime snoozedUntil;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
