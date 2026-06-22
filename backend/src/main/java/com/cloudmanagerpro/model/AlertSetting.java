package com.cloudmanagerpro.model;

import com.cloudmanagerpro.util.EncryptedStringConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
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
@Table(name = "alert_settings")
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class AlertSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled = false;

    @Column(name = "slack_enabled", nullable = false)
    private boolean slackEnabled = false;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "encrypted_slack_webhook", columnDefinition = "text")
    private String encryptedSlackWebhook;

    @Column(name = "email_recipients", columnDefinition = "text")
    private String emailRecipients;

    @Column(name = "cost_spike_threshold", precision = 18, scale = 4)
    private BigDecimal costSpikeThreshold = new BigDecimal("20.00");

    @Column(name = "idle_alerts_enabled", nullable = false)
    private boolean idleAlertsEnabled = true;

    @Column(name = "cleanup_alerts_enabled", nullable = false)
    private boolean cleanupAlertsEnabled = true;

    @Column(name = "digest_enabled", nullable = false)
    private boolean digestEnabled = true;

    @Column(name = "digest_frequency", length = 16)
    private String digestFrequency = "DAILY";

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
