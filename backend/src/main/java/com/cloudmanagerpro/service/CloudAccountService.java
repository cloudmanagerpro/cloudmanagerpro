package com.cloudmanagerpro.service;

import com.cloudmanagerpro.config.AppProperties;
import com.cloudmanagerpro.dto.cloudaccount.CloudAccountDto;
import com.cloudmanagerpro.dto.cloudaccount.ConnectionTestDto;
import com.cloudmanagerpro.dto.cloudaccount.CreateCloudAccountRequest;
import com.cloudmanagerpro.dto.sync.SyncJobDto;
import com.cloudmanagerpro.exception.DuplicateResourceException;
import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.SyncJob;
import com.cloudmanagerpro.model.enums.ConnectionStatus;
import com.cloudmanagerpro.repository.CleanupCandidateRepository;
import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import com.cloudmanagerpro.repository.CostDailyRepository;
import com.cloudmanagerpro.repository.IdleCandidateRepository;
import com.cloudmanagerpro.repository.RightsizingRecommendationRepository;
import com.cloudmanagerpro.repository.SyncJobRepository;
import com.cloudmanagerpro.repository.TagComplianceResultRepository;
import com.cloudmanagerpro.service.cost.CostService;
import com.cloudmanagerpro.service.provider.ConnectionTestResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudAccountService {

    private static final int HISTORICAL_COST_DAYS = 90;

    private final CloudAccountRepository cloudAccountRepository;
    private final CloudResourceRepository cloudResourceRepository;
    private final SyncJobRepository syncJobRepository;
    private final CleanupCandidateRepository cleanupCandidateRepository;
    private final IdleCandidateRepository idleCandidateRepository;
    private final CostDailyRepository costDailyRepository;
    private final TagComplianceResultRepository tagComplianceResultRepository;
    private final RightsizingRecommendationRepository rightsizingRecommendationRepository;
    private final com.cloudmanagerpro.service.provider.ProviderClientFactory providerClientFactory;
    private final SyncService syncService;
    private final CostService costService;
    private final AnalysisService analysisService;
    private final MaintenanceService maintenanceService;
    private final AppProperties properties;

    @Transactional(readOnly = true)
    public List<CloudAccountDto> list(UUID userId) {
        return cloudAccountRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(CloudAccountDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public CloudAccountDto get(UUID userId, UUID id) {
        return CloudAccountDto.from(require(userId, id));
    }

    /**
     * Not {@code @Transactional} on purpose: the initial sync/cost/analysis steps run in their own
     * isolated transactions. A real-account failure there (which throws, with no demo fallback) must
     * not roll back the persisted account + its ERROR status, and we must not hold a DB transaction
     * open across slow AWS network calls.
     */
    public CloudAccountDto create(UUID userId, CreateCloudAccountRequest request) {
        if (cloudAccountRepository.existsByUserIdAndNameIgnoreCase(userId, request.name().trim())) {
            throw new DuplicateResourceException("A cloud account with this name already exists");
        }
        CloudAccount account = new CloudAccount();
        account.setUserId(userId);
        account.setName(request.name().trim());
        account.setProvider(request.provider());
        account.setConnectionStatus(ConnectionStatus.PENDING);
        account.setDefaultRegion(StringUtils.hasText(request.defaultRegion())
                ? request.defaultRegion()
                : properties.getAws().getDefaultRegion());
        if (StringUtils.hasText(request.accessKeyId())) {
            account.setEncryptedAccessKey(request.accessKeyId());
        }
        if (StringUtils.hasText(request.secretAccessKey())) {
            account.setEncryptedSecretKey(request.secretAccessKey());
        }
        account.setRoleArn(request.roleArn());
        account.setExternalId(request.externalId());
        account = cloudAccountRepository.save(account);

        applyConnectionTest(account);
        cloudAccountRepository.save(account);

        populate(account);
        return CloudAccountDto.from(cloudAccountRepository.findById(account.getId()).orElse(account));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        CloudAccount account = require(userId, id);
        UUID accountId = account.getId();
        cleanupCandidateRepository.deleteByCloudAccountId(accountId);
        idleCandidateRepository.deleteByCloudAccountId(accountId);
        rightsizingRecommendationRepository.deleteByCloudAccountId(accountId);
        tagComplianceResultRepository.deleteByCloudAccountId(accountId);
        costDailyRepository.deleteByCloudAccountId(accountId);
        syncJobRepository.deleteByCloudAccountId(accountId);
        cloudResourceRepository.deleteByCloudAccountId(accountId);
        cloudAccountRepository.delete(account);
    }

    @Transactional
    public ConnectionTestDto test(UUID userId, UUID id) {
        CloudAccount account = require(userId, id);
        ConnectionTestResult result = applyConnectionTest(account);
        cloudAccountRepository.save(account);
        return new ConnectionTestDto(result.success(), result.message(), result.accountIdentifier(),
                account.getConnectionStatus());
    }

    /**
     * Manual "Sync now". Not {@code @Transactional}: {@link SyncService#syncAccount} commits the
     * SyncJob + account status in its own transaction (so a SUCCESS/FAILED result is always durable),
     * then cost/analysis/cleanup run as isolated best-effort steps.
     */
    public SyncJobDto sync(UUID userId, UUID id) {
        CloudAccount account = require(userId, id);
        SyncJob job = syncService.syncAccount(account, "MANUAL");
        // Full cost refresh (delete + re-ingest) replaces any stale demo cost rows on a now-real
        // account with real Cost Explorer data; for demo accounts it regenerates demo costs.
        safe(() -> costService.ingestHistorical(account, HISTORICAL_COST_DAYS));
        safe(() -> analysisService.analyzeUser(userId));
        // Clear any leftover demo rows that belong to deleted accounts (never touches real account data).
        safe(() -> maintenanceService.purgeOrphanedData(userId));
        return SyncJobDto.from(job);
    }

    private void populate(CloudAccount account) {
        safe(() -> syncService.syncAccount(account, "INITIAL"));
        safe(() -> costService.ingestHistorical(account, HISTORICAL_COST_DAYS));
        safe(() -> analysisService.analyzeUser(account.getUserId()));
    }

    private ConnectionTestResult applyConnectionTest(CloudAccount account) {
        ConnectionTestResult result;
        try {
            result = providerClientFactory.forProvider(account.getProvider()).testConnection(account);
        } catch (Exception ex) {
            result = ConnectionTestResult.failure("Connection test failed: " + ex.getMessage());
        }
        if (result.success()) {
            account.setConnectionStatus(ConnectionStatus.CONNECTED);
            account.setAccountIdentifier(result.accountIdentifier());
            account.setLastError(null);
        } else {
            account.setConnectionStatus(ConnectionStatus.ERROR);
            account.setLastError(result.message());
        }
        return result;
    }

    private CloudAccount require(UUID userId, UUID id) {
        return cloudAccountRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cloud account not found"));
    }

    private void safe(Runnable task) {
        try {
            task.run();
        } catch (Exception ex) {
            log.warn("Post-create/sync step failed: {}", ex.getMessage());
        }
    }
}
