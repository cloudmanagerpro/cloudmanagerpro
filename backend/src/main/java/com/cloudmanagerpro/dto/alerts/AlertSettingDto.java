package com.cloudmanagerpro.dto.alerts;

import com.cloudmanagerpro.model.AlertSetting;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.UUID;

/** Alert settings projection. The Slack webhook is never returned; only a configured flag/mask. */
public record AlertSettingDto(
        UUID id,
        boolean emailEnabled,
        boolean slackEnabled,
        boolean slackWebhookConfigured,
        String slackWebhookMasked,
        String emailRecipients,
        BigDecimal costSpikeThreshold,
        boolean idleAlertsEnabled,
        boolean cleanupAlertsEnabled,
        boolean digestEnabled,
        String digestFrequency
) {
    public static AlertSettingDto from(AlertSetting s) {
        boolean configured = StringUtils.hasText(s.getEncryptedSlackWebhook());
        return new AlertSettingDto(
                s.getId(),
                s.isEmailEnabled(),
                s.isSlackEnabled(),
                configured,
                configured ? "https://hooks.slack.com/services/****" : null,
                s.getEmailRecipients(),
                s.getCostSpikeThreshold(),
                s.isIdleAlertsEnabled(),
                s.isCleanupAlertsEnabled(),
                s.isDigestEnabled(),
                s.getDigestFrequency());
    }
}
