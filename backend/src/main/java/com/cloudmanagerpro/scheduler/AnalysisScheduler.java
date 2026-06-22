package com.cloudmanagerpro.scheduler;

import com.cloudmanagerpro.config.AppProperties;
import com.cloudmanagerpro.model.User;
import com.cloudmanagerpro.repository.UserRepository;
import com.cloudmanagerpro.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/** Re-runs cleanup/idle/tag/rightsizing analysis for every tenant. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnalysisScheduler {

    private final UserRepository userRepository;
    private final AnalysisService analysisService;
    private final AppProperties properties;

    @Scheduled(cron = "${app.scheduler.analysis.cron}")
    public void analyzeAllUsers() {
        if (!properties.getScheduler().getAnalysis().isEnabled()) {
            return;
        }
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) {
            return;
        }
        for (User user : users) {
            try {
                analysisService.analyzeUser(user.getId());
            } catch (Exception ex) {
                log.warn("Scheduled analysis failed for user {}: {}", user.getId(), ex.getMessage());
            }
        }
    }
}
