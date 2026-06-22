package com.cloudmanagerpro.service;

import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import com.cloudmanagerpro.repository.CostDailyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Safe stale-data maintenance. Removes rows that reference a cloud account that no longer exists for
 * the user (e.g. leftover demo rows after the demo accounts were deleted, or demo rows that lingered
 * on an account before its first real sync). This NEVER deletes data belonging to an existing
 * account, so a real account's real data is always preserved.
 *
 * <p>Child rows of deleted resources (cleanup/idle candidates, recommendations, tag results) are
 * removed by the {@code ON DELETE CASCADE} foreign keys.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceService {

    private final CloudAccountRepository cloudAccountRepository;
    private final CloudResourceRepository cloudResourceRepository;
    private final CostDailyRepository costDailyRepository;

    @Transactional
    public void purgeOrphanedData(UUID userId) {
        List<UUID> accountIds = cloudAccountRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(CloudAccount::getId)
                .toList();
        if (accountIds.isEmpty()) {
            // No accounts at all: nothing to anchor "orphan" to; leave data untouched to stay safe.
            return;
        }
        cloudResourceRepository.deleteByUserIdAndCloudAccountIdNotIn(userId, accountIds);
        costDailyRepository.deleteByUserIdAndCloudAccountIdNotIn(userId, accountIds);
    }
}
