package com.cloudmanagerpro.model;

import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.WasteState;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "cloud_resources")
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CloudResource {

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
    @Column(name = "resource_type", nullable = false, length = 32)
    private ResourceType resourceType;

    /** Provider-native resource id (e.g. i-0abc..., vol-0abc...). */
    @Column(name = "external_id", nullable = false)
    private String externalId;

    @Column
    private String name;

    @Column(length = 64)
    private String region;

    @Column(length = 64)
    private String status;

    @Column(name = "instance_type", length = 64)
    private String instanceType;

    @Column(name = "size_gb")
    private Integer sizeGb;

    @Column(name = "cpu_utilization")
    private Double cpuUtilization;

    @Column(name = "network_in_bytes")
    private Double networkInBytes;

    @Column(name = "disk_io_bytes")
    private Double diskIoBytes;

    @Column(name = "monthly_cost", precision = 18, scale = 4)
    private BigDecimal monthlyCost = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "waste_state", nullable = false, length = 32)
    private WasteState wasteState = WasteState.NONE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> tags = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "last_activity_at")
    private OffsetDateTime lastActivityAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
