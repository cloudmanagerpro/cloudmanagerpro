package com.cloudmanagerpro.service;

import com.cloudmanagerpro.model.AlertSetting;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.User;
import com.cloudmanagerpro.model.enums.ConnectionStatus;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.repository.AlertSettingRepository;
import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.service.cost.CostService;
import com.cloudmanagerpro.service.provider.ConnectionTestResult;
import com.cloudmanagerpro.service.provider.ProviderClientFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds a brand-new tenant (in demo mode) with multiple connected cloud accounts, then runs the full
 * sync -> cost ingestion -> analysis pipeline so the dashboard is immediately populated with realistic
 * resources, costs, waste findings and recommendations — all without any real cloud credentials.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DemoDataService implements DemoSeeder {

    private static final int HISTORICAL_COST_DAYS = 90;

    private final CloudAccountRepository cloudAccountRepository;
    private final AlertSettingRepository alertSettingRepository;
    private final ProviderClientFactory providerClientFactory;
    private final SyncService syncService;
    private final CostService costService;
    private final AnalysisService analysisService;

    @Override
    @Transactional
    public void seedForNewUser(User user) {
        List<CloudAccount> accounts = List.of(
                createAccount(user, "AWS Production", Provider.AWS, "us-east-1"),
                createAccount(user, "Azure Dev", Provider.AZURE, "eastus"),
                createAccount(user, "GCP Analytics", Provider.GCP, "us-central1"));

        for (CloudAccount account : accounts) {
            syncService.syncAccount(account, "DEMO_SEED");
            costService.ingestHistorical(account, HISTORICAL_COST_DAYS);
        }
        analysisService.analyzeUser(user.getId());
        ensureAlertSetting(user);
        log.info("Seeded demo data for user {} ({} accounts)", user.getId(), accounts.size());
    }

    private CloudAccount createAccount(User user, String name, Provider provider, String region) {
        CloudAccount account = new CloudAccount();
        account.setUserId(user.getId());
        account.setName(name);
        account.setProvider(provider);
        account.setDefaultRegion(region);
        account.setConnectionStatus(ConnectionStatus.PENDING);
        account = cloudAccountRepository.save(account);

        ConnectionTestResult result = providerClientFactory.forProvider(provider).testConnection(account);
        account.setConnectionStatus(result.success() ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR);
        account.setAccountIdentifier(result.accountIdentifier());
        return cloudAccountRepository.save(account);
    }

    private void ensureAlertSetting(User user) {
        if (alertSettingRepository.findByUserId(user.getId()).isEmpty()) {
            AlertSetting setting = new AlertSetting();
            setting.setUserId(user.getId());
            setting.setEmailRecipients(user.getEmail());
            alertSettingRepository.save(setting);
        }
    }
}
