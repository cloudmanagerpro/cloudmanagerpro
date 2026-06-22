package com.cloudmanagerpro.service.alerts;

import com.cloudmanagerpro.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Sends plain-text emails via the autoconfigured {@link JavaMailSender}. When SMTP is not configured
 * (no host) it logs and no-ops gracefully so the rest of the app keeps working.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AppProperties properties;

    public boolean isConfigured() {
        return StringUtils.hasText(properties.getSmtp().getHost());
    }

    public boolean send(String recipients, String subject, String body) {
        if (!isConfigured()) {
            log.info("SMTP not configured; skipping email '{}'", subject);
            return false;
        }
        if (!StringUtils.hasText(recipients)) {
            log.info("No recipients provided; skipping email '{}'", subject);
            return false;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.info("JavaMailSender unavailable; skipping email '{}'", subject);
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(properties.getSmtp().getFrom());
            message.setTo(recipients.split("[,;\\s]+"));
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            return true;
        } catch (Exception ex) {
            log.warn("Failed to send email '{}': {}", subject, ex.getMessage());
            return false;
        }
    }
}
