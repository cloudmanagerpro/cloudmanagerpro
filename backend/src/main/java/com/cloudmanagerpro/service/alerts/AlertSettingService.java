package com.cloudmanagerpro.service.alerts;

import com.cloudmanagerpro.dto.alerts.AlertSettingDto;
import com.cloudmanagerpro.dto.alerts.UpdateAlertSettingRequest;
import com.cloudmanagerpro.model.AlertSetting;
import com.cloudmanagerpro.repository.AlertSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertSettingService {

    private final AlertSettingRepository alertSettingRepository;

    @Transactional
    public AlertSetting getOrCreate(UUID userId) {
        return alertSettingRepository.findByUserId(userId).orElseGet(() -> {
            AlertSetting setting = new AlertSetting();
            setting.setUserId(userId);
            return alertSettingRepository.save(setting);
        });
    }

    @Transactional
    public AlertSettingDto get(UUID userId) {
        return AlertSettingDto.from(getOrCreate(userId));
    }

    @Transactional
    public AlertSettingDto update(UUID userId, UpdateAlertSettingRequest request) {
        AlertSetting setting = getOrCreate(userId);
        if (request.emailEnabled() != null) {
            setting.setEmailEnabled(request.emailEnabled());
        }
        if (request.slackEnabled() != null) {
            setting.setSlackEnabled(request.slackEnabled());
        }
        if (request.slackWebhookUrl() != null) {
            setting.setEncryptedSlackWebhook(request.slackWebhookUrl().isBlank() ? null : request.slackWebhookUrl());
        }
        if (request.emailRecipients() != null) {
            setting.setEmailRecipients(request.emailRecipients());
        }
        if (request.costSpikeThreshold() != null) {
            setting.setCostSpikeThreshold(request.costSpikeThreshold());
        }
        if (request.idleAlertsEnabled() != null) {
            setting.setIdleAlertsEnabled(request.idleAlertsEnabled());
        }
        if (request.cleanupAlertsEnabled() != null) {
            setting.setCleanupAlertsEnabled(request.cleanupAlertsEnabled());
        }
        if (request.digestEnabled() != null) {
            setting.setDigestEnabled(request.digestEnabled());
        }
        if (request.digestFrequency() != null) {
            setting.setDigestFrequency(request.digestFrequency());
        }
        return AlertSettingDto.from(alertSettingRepository.save(setting));
    }
}
