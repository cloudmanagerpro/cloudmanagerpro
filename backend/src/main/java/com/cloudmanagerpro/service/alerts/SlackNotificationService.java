package com.cloudmanagerpro.service.alerts;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.Map;

/** Posts messages to a Slack incoming webhook. Gracefully reports failure rather than throwing. */
@Slf4j
@Service
public class SlackNotificationService {

    private final RestClient restClient;

    public SlackNotificationService() {
        this.restClient = RestClient.builder().build();
    }

    public boolean send(String webhookUrl, String text) {
        if (!StringUtils.hasText(webhookUrl)) {
            log.info("Slack webhook not configured; skipping notification");
            return false;
        }
        try {
            restClient.post()
                    .uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("text", text))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.warn("Failed to send Slack notification: {}", ex.getMessage());
            return false;
        }
    }
}
