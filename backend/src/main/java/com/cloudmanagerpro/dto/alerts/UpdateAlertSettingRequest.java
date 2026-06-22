package com.cloudmanagerpro.dto.alerts;

import java.math.BigDecimal;

/**
 * Alert settings update. A null {@code slackWebhookUrl} leaves the stored webhook unchanged; an
 * empty string clears it; a non-empty value replaces it (stored encrypted).
 */
public record UpdateAlertSettingRequest(
        Boolean emailEnabled,
        Boolean slackEnabled,
        String slackWebhookUrl,
        String emailRecipients,
        BigDecimal costSpikeThreshold,
        Boolean idleAlertsEnabled,
        Boolean cleanupAlertsEnabled,
        Boolean digestEnabled,
        String digestFrequency
) {
}
