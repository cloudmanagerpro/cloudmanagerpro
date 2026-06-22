package com.cloudmanagerpro.scheduler;

import com.cloudmanagerpro.config.AppProperties;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.service.SyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/** Re-syncs every cloud account on a fixed cadence (default every 10 minutes). */
@Slf4j
@Component
@RequiredArgsConstructor
public class SyncScheduler {

    private final CloudAccountRepository cloudAccountRepository;
    private final SyncService syncService;
    private final AppProperties properties;

    @Scheduled(cron = "${app.scheduler.sync.cron}")
    public void syncAllAccounts() {
        if (!properties.getScheduler().getSync().isEnabled()) {
            return;
        }
        List<CloudAccount> accounts = cloudAccountRepository.findAll();
        if (accounts.isEmpty()) {
            return;
        }
        log.debug("Scheduled sync starting for {} accounts", accounts.size());
        for (CloudAccount account : accounts) {
            try {
                syncService.syncAccount(account, "SCHEDULED");
            } catch (Exception ex) {
                log.warn("Scheduled sync failed for account {}: {}", account.getId(), ex.getMessage());
            }
        }
    }
}
