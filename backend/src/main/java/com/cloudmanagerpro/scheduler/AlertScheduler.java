package com.cloudmanagerpro.scheduler;

import com.cloudmanagerpro.config.AppProperties;
import com.cloudmanagerpro.model.User;
import com.cloudmanagerpro.repository.UserRepository;
import com.cloudmanagerpro.service.alerts.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/** Sends the daily alert digest to every tenant according to their alert settings. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertScheduler {

    private final UserRepository userRepository;
    private final AlertService alertService;
    private final AppProperties properties;

    @Scheduled(cron = "${app.scheduler.alert.cron}")
    public void sendDailyDigests() {
        if (!properties.getScheduler().getAlert().isEnabled()) {
            return;
        }
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) {
            return;
        }
        for (User user : users) {
            try {
                alertService.sendDigest(user.getId());
            } catch (Exception ex) {
                log.warn("Scheduled digest failed for user {}: {}", user.getId(), ex.getMessage());
            }
        }
    }
}
