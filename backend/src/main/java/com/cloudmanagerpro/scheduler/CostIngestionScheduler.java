package com.cloudmanagerpro.scheduler;

import com.cloudmanagerpro.config.AppProperties;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.service.cost.CostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/** Appends the previous day's cost data for every account (default daily). */
@Slf4j
@Component
@RequiredArgsConstructor
public class CostIngestionScheduler {

    private final CloudAccountRepository cloudAccountRepository;
    private final CostService costService;
    private final AppProperties properties;

    @Scheduled(cron = "${app.scheduler.cost-ingestion.cron}")
    public void ingestDailyCosts() {
        if (!properties.getScheduler().getCostIngestion().isEnabled()) {
            return;
        }
        List<CloudAccount> accounts = cloudAccountRepository.findAll();
        if (accounts.isEmpty()) {
            return;
        }
        for (CloudAccount account : accounts) {
            try {
                costService.ingestDaily(account);
            } catch (Exception ex) {
                log.warn("Scheduled cost ingestion failed for account {}: {}", account.getId(), ex.getMessage());
            }
        }
    }
}
