package com.cloudmanagerpro.model;

import com.cloudmanagerpro.model.enums.ConnectionStatus;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.SyncStatus;
import com.cloudmanagerpro.util.EncryptedStringConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
@Table(name = "cloud_accounts")
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CloudAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Provider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "connection_status", nullable = false, length = 16)
    private ConnectionStatus connectionStatus = ConnectionStatus.PENDING;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "encrypted_access_key", columnDefinition = "text")
    private String encryptedAccessKey;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "encrypted_secret_key", columnDefinition = "text")
    private String encryptedSecretKey;

    @Column(name = "role_arn")
    private String roleArn;

    @Column(name = "external_id")
    private String externalId;

    @Column(name = "default_region", length = 64)
    private String defaultRegion;

    /** AWS account id, Azure subscription id or GCP project id. */
    @Column(name = "account_identifier")
    private String accountIdentifier;

    @Column(name = "last_sync_at")
    private OffsetDateTime lastSyncAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_sync_status", length = 16)
    private SyncStatus lastSyncStatus;

    @Column(name = "last_error", columnDefinition = "text")
    private String lastError;

    @Column(name = "resource_count", nullable = false)
    private int resourceCount = 0;

    @Column(name = "monthly_cost", precision = 18, scale = 4)
    private BigDecimal monthlyCost = BigDecimal.ZERO;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
