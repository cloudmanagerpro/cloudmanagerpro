package com.cloudmanagerpro.service.alerts;

import com.cloudmanagerpro.dto.alerts.AlertTestResultDto;
import com.cloudmanagerpro.dto.alerts.TestEmailRequest;
import com.cloudmanagerpro.dto.alerts.TestSlackRequest;
import com.cloudmanagerpro.dto.cost.CostSummaryDto;
import com.cloudmanagerpro.model.AlertLog;
import com.cloudmanagerpro.model.AlertSetting;
import com.cloudmanagerpro.model.enums.AlertChannel;
import com.cloudmanagerpro.model.enums.AlertType;
import com.cloudmanagerpro.model.enums.CleanupStatus;
import com.cloudmanagerpro.repository.AlertLogRepository;
import com.cloudmanagerpro.repository.UserRepository;
import com.cloudmanagerpro.service.cleanup.CleanupService;
import com.cloudmanagerpro.service.cost.CostService;
import com.cloudmanagerpro.service.idle.IdleService;
import com.cloudmanagerpro.service.rightsizing.RightsizingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertSettingService alertSettingService;
    private final AlertLogRepository alertLogRepository;
    private final SlackNotificationService slackNotificationService;
    private final EmailNotificationService emailNotificationService;
    private final CostService costService;
    private final CleanupService cleanupService;
    private final IdleService idleService;
    private final RightsizingService rightsizingService;
    private final UserRepository userRepository;

    @Transactional
    public AlertTestResultDto testSlack(UUID userId, TestSlackRequest request) {
        AlertSetting setting = alertSettingService.getOrCreate(userId);
        String webhook = request != null && StringUtils.hasText(request.webhookUrl())
                ? request.webhookUrl()
                : setting.getEncryptedSlackWebhook();
        if (!StringUtils.hasText(webhook)) {
            return new AlertTestResultDto(false, "slack", "No Slack webhook configured");
        }
        String message = ":white_check_mark: CloudManagerPro test alert — your Slack integration is working.";
        boolean ok = slackNotificationService.send(webhook, message);
        record(userId, AlertType.TEST, AlertChannel.SLACK, "Slack test", message, ok,
                ok ? null : "Slack webhook call failed");
        return new AlertTestResultDto(ok, "slack",
                ok ? "Test message sent to Slack" : "Failed to send Slack message");
    }

    @Transactional
    public AlertTestResultDto testEmail(UUID userId, TestEmailRequest request) {
        AlertSetting setting = alertSettingService.getOrCreate(userId);
        String recipient = request != null && StringUtils.hasText(request.recipient())
                ? request.recipient()
                : setting.getEmailRecipients();
        if (!StringUtils.hasText(recipient)) {
            recipient = userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);
        }
        if (!StringUtils.hasText(recipient)) {
            return new AlertTestResultDto(false, "email", "No recipient configured");
        }
        String subject = "CloudManagerPro test alert";
        String body = "This is a test email from CloudManagerPro. Your email alerts are configured correctly.";
        boolean ok = emailNotificationService.send(recipient, subject, body);
        record(userId, AlertType.TEST, AlertChannel.EMAIL, subject, body, ok,
                ok ? null : (emailNotificationService.isConfigured() ? "Email send failed" : "SMTP not configured"));
        String message = ok ? "Test email sent"
                : (emailNotificationService.isConfigured() ? "Failed to send email" : "SMTP not configured (logged)");
        return new AlertTestResultDto(ok, "email", message);
    }

    @Transactional
    public void sendDigest(UUID userId) {
        AlertSetting setting = alertSettingService.getOrCreate(userId);
        if (!setting.isDigestEnabled()) {
            return;
        }
        String message = buildDigest(userId);
        String subject = "CloudManagerPro daily digest";

        if (setting.isSlackEnabled() && StringUtils.hasText(setting.getEncryptedSlackWebhook())) {
            boolean ok = slackNotificationService.send(setting.getEncryptedSlackWebhook(), message);
            record(userId, AlertType.DIGEST, AlertChannel.SLACK, subject, message, ok, ok ? null : "Slack send failed");
        }
        if (setting.isEmailEnabled() && StringUtils.hasText(setting.getEmailRecipients())) {
            boolean ok = emailNotificationService.send(setting.getEmailRecipients(), subject, message);
            record(userId, AlertType.DIGEST, AlertChannel.EMAIL, subject, message, ok, ok ? null : "Email send failed");
        }
    }

    private String buildDigest(UUID userId) {
        CostSummaryDto cost = costService.summary(userId);
        long cleanupCount = cleanupService.countByStatus(userId, CleanupStatus.PENDING);
        long idleCount = idleService.count(userId);
        long rightsizingCount = rightsizingService.summary(userId).count();
        return String.format("CloudManagerPro daily digest%n"
                        + "- Spend (last 30 days): $%s%n"
                        + "- Projected this month: $%s%n"
                        + "- Potential monthly savings: $%s%n"
                        + "- Cleanup opportunities: %d%n"
                        + "- Idle resources: %d%n"
                        + "- Rightsizing recommendations: %d",
                cost.last30Days(), cost.projectedMonthly(), cost.totalPotentialSavings(),
                cleanupCount, idleCount, rightsizingCount);
    }

    private void record(UUID userId, AlertType type, AlertChannel channel, String subject, String message,
                        boolean success, String error) {
        AlertLog logEntry = new AlertLog();
        logEntry.setUserId(userId);
        logEntry.setAlertType(type);
        logEntry.setChannel(channel);
        logEntry.setSubject(subject);
        logEntry.setMessage(message);
        logEntry.setSuccess(success);
        logEntry.setErrorMessage(error);
        logEntry.setSentAt(OffsetDateTime.now());
        alertLogRepository.save(logEntry);
    }
}
