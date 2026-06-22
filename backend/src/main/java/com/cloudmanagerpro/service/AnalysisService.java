package com.cloudmanagerpro.service;

import com.cloudmanagerpro.service.cleanup.CleanupService;
import com.cloudmanagerpro.service.idle.IdleService;
import com.cloudmanagerpro.service.rightsizing.RightsizingService;
import com.cloudmanagerpro.service.tags.TagComplianceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Runs every analysis engine for a tenant. Engines are independent and individually guarded so one
 * failure never aborts the others; ordering lets cleanup own the resource waste-state, rightsizing
 * then flags remaining underutilized resources.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final CleanupService cleanupService;
    private final RightsizingService rightsizingService;
    private final IdleService idleService;
    private final TagComplianceService tagComplianceService;

    public void analyzeUser(UUID userId) {
        run("cleanup", () -> cleanupService.analyze(userId));
        run("rightsizing", () -> rightsizingService.analyze(userId));
        run("idle", () -> idleService.analyze(userId));
        run("tag-compliance", () -> tagComplianceService.analyze(userId));
    }

    private void run(String engine, Runnable task) {
        try {
            task.run();
        } catch (Exception ex) {
            log.warn("Analysis engine '{}' failed: {}", engine, ex.getMessage());
        }
    }
}
