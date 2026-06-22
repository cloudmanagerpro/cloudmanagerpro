package com.cloudmanagerpro.dto.alerts;

/** Optional webhook override for a one-off Slack test; falls back to the saved webhook when null. */
public record TestSlackRequest(
        String webhookUrl
) {
}
