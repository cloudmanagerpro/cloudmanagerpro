package com.cloudmanagerpro.service;

import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.SyncJob;
import com.cloudmanagerpro.model.enums.ConnectionStatus;
import com.cloudmanagerpro.model.enums.SyncStatus;
import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import com.cloudmanagerpro.repository.SyncJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Orchestrates resource synchronization: provider fetch -> upsert -> reconcile -> job + account update. */
@Slf4j
@Service
@RequiredArgsConstructor
public class SyncService {

    private final com.cloudmanagerpro.service.provider.ProviderClientFactory providerClientFactory;
    private final CloudResourceRepository resourceRepository;
    private final SyncJobRepository syncJobRepository;
    private final CloudAccountRepository cloudAccountRepository;

    @Transactional
    public SyncJob syncAccount(CloudAccount account, String trigger) {
        SyncJob job = new SyncJob();
        job.setUserId(account.getUserId());
        job.setCloudAccountId(account.getId());
        job.setProvider(account.getProvider());
        job.setTriggerType(trigger);
        job.setStatus(SyncStatus.RUNNING);
        job.setStartedAt(OffsetDateTime.now());
        job = syncJobRepository.save(job);

        long startMs = System.currentTimeMillis();
        try {
            List<CloudResource> fetched = providerClientFactory.forProvider(account.getProvider())
                    .syncResources(account);

            Set<String> seen = new HashSet<>();
            int added = 0;
            int updated = 0;
            BigDecimal monthlyCost = BigDecimal.ZERO;

            for (CloudResource fetchedResource : fetched) {
                seen.add(fetchedResource.getExternalId());
                monthlyCost = monthlyCost.add(nz(fetchedResource.getMonthlyCost()));
                Optional<CloudResource> existing = resourceRepository
                        .findByCloudAccountIdAndExternalId(account.getId(), fetchedResource.getExternalId());
                if (existing.isPresent()) {
                    copyInto(existing.get(), fetchedResource);
                    resourceRepository.save(existing.get());
                    updated++;
                } else {
                    fetchedResource.setUserId(account.getUserId());
                    fetchedResource.setCloudAccountId(account.getId());
                    resourceRepository.save(fetchedResource);
                    added++;
                }
            }

            int removed = reconcile(account, seen);

            job.setResourcesSynced(fetched.size());
            job.setResourcesAdded(added);
            job.setResourcesUpdated(updated);
            job.setResourcesRemoved(removed);
            job.setStatus(SyncStatus.SUCCESS);
            job.setFinishedAt(OffsetDateTime.now());
            job.setDurationMs(System.currentTimeMillis() - startMs);

            account.setLastSyncAt(OffsetDateTime.now());
            account.setLastSyncStatus(SyncStatus.SUCCESS);
            account.setConnectionStatus(ConnectionStatus.CONNECTED);
            account.setResourceCount(fetched.size());
            account.setMonthlyCost(monthlyCost);
            account.setLastError(null);
        } catch (Exception ex) {
            // Real-account failure (bad creds / missing IAM permission / region / network). We DO NOT
            // substitute demo data: record the failure so the broken connection is visible to the user.
            log.warn("Sync failed for account {}: {}", account.getId(), ex.getMessage());
            job.setStatus(SyncStatus.FAILED);
            job.setFinishedAt(OffsetDateTime.now());
            job.setDurationMs(System.currentTimeMillis() - startMs);
            job.setErrorMessage(truncate(ex.getMessage()));
            account.setLastSyncAt(OffsetDateTime.now());
            account.setLastSyncStatus(SyncStatus.FAILED);
            account.setConnectionStatus(ConnectionStatus.ERROR);
            account.setLastError(truncate(ex.getMessage()));
        }
        // Persist account state explicitly so success/failure is durable even when the caller is not
        // itself transactional (manual sync, account creation, schedulers).
        cloudAccountRepository.save(account);
        return syncJobRepository.save(job);
    }

    @Transactional(readOnly = true)
    public Page<SyncJob> getJobs(UUID userId, Pageable pageable) {
        return syncJobRepository.findByUserId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public SyncJob getJob(UUID id, UUID userId) {
        return syncJobRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Sync job not found"));
    }

    private int reconcile(CloudAccount account, Set<String> seenExternalIds) {
        List<CloudResource> current = resourceRepository
                .findByUserIdAndCloudAccountId(account.getUserId(), account.getId());
        int removed = 0;
        for (CloudResource resource : current) {
            if (!seenExternalIds.contains(resource.getExternalId())) {
                resourceRepository.delete(resource);
                removed++;
            }
        }
        return removed;
    }

    private void copyInto(CloudResource target, CloudResource source) {
        target.setProvider(source.getProvider());
        target.setResourceType(source.getResourceType());
        target.setName(source.getName());
        target.setRegion(source.getRegion());
        target.setStatus(source.getStatus());
        target.setInstanceType(source.getInstanceType());
        target.setSizeGb(source.getSizeGb());
        target.setCpuUtilization(source.getCpuUtilization());
        target.setNetworkInBytes(source.getNetworkInBytes());
        target.setDiskIoBytes(source.getDiskIoBytes());
        target.setMonthlyCost(source.getMonthlyCost());
        target.setWasteState(source.getWasteState());
        target.setTags(source.getTags());
        target.setMetadata(source.getMetadata());
        target.setLastActivityAt(source.getLastActivityAt());
    }

    private BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String truncate(String message) {
        if (message == null) {
            return "Unknown error";
        }
        return message.length() > 1000 ? message.substring(0, 1000) : message;
    }
}
