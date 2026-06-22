package com.cloudmanagerpro.service.actions;

import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.service.SyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Re-syncs an account's resources after a successful real cloud mutation so the Resources drawer
 * reflects the new state within seconds. Runs on the {@code postActionExecutor} pool and never
 * propagates failures back to the action request.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostActionSyncService {

    private final CloudAccountRepository cloudAccountRepository;
    private final SyncService syncService;

    @Async("postActionExecutor")
    public void resyncAccount(UUID userId, UUID cloudAccountId) {
        if (userId == null || cloudAccountId == null) {
            return;
        }
        try {
            cloudAccountRepository.findByIdAndUserId(cloudAccountId, userId)
                    .ifPresent(account -> syncService.syncAccount(account, "POST_ACTION"));
        } catch (Exception ex) {
            log.warn("Post-action re-sync failed for account {}: {}", cloudAccountId, ex.getMessage());
        }
    }
}
