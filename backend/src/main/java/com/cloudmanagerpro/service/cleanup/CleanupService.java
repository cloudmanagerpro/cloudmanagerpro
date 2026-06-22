package com.cloudmanagerpro.service.cleanup;

import com.cloudmanagerpro.config.AppProperties;
import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.dto.cleanup.CleanupCandidateDto;
import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.model.CleanupCandidate;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.CleanupStatus;
import com.cloudmanagerpro.model.enums.CleanupType;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.Severity;
import com.cloudmanagerpro.model.enums.WasteState;
import com.cloudmanagerpro.repository.CleanupCandidateRepository;
import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import com.cloudmanagerpro.service.ResourceTypes;
import com.cloudmanagerpro.service.audit.AuditService;
import com.cloudmanagerpro.service.provider.ActionResult;
import com.cloudmanagerpro.service.provider.CloudProviderClient;
import com.cloudmanagerpro.service.provider.ProviderClientFactory;
import com.cloudmanagerpro.service.provider.ProviderMode;
import com.cloudmanagerpro.service.tags.TagPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Detects waste (idle/stopped/unattached/unused/old/missing-tags/orphaned) and gates destructive actions. */
@Slf4j
@Service
@RequiredArgsConstructor
public class CleanupService {

    private final CloudResourceRepository resourceRepository;
    private final CleanupCandidateRepository cleanupCandidateRepository;
    private final CloudAccountRepository cloudAccountRepository;
    private final ProviderClientFactory providerClientFactory;
    private final AuditService auditService;
    private final AppProperties properties;

    @Transactional
    public List<CleanupCandidateDto> analyze(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now();
        List<CleanupCandidate> existing = cleanupCandidateRepository.findByUserIdOrderByEstimatedMonthlySavingsDesc(userId);

        // Refresh transient candidates, but never wipe ignored/executed or actively-snoozed ones.
        for (CleanupCandidate candidate : existing) {
            boolean transientStatus = candidate.getStatus() == CleanupStatus.PENDING
                    || candidate.getStatus() == CleanupStatus.DRY_RUN_DONE;
            if (transientStatus && !isActiveSnooze(candidate, now)) {
                cleanupCandidateRepository.delete(candidate);
            }
        }

        Set<UUID> protectedResourceIds = new HashSet<>();
        for (CleanupCandidate candidate : existing) {
            boolean keep = candidate.getStatus() == CleanupStatus.IGNORED
                    || candidate.getStatus() == CleanupStatus.EXECUTED
                    || isActiveSnooze(candidate, now);
            if (keep) {
                addIfNotNull(protectedResourceIds, candidate.getResourceId());
            }
        }

        List<CloudResource> resources = resourceRepository.findByUserId(userId);
        List<CleanupCandidate> created = new ArrayList<>();
        for (CloudResource resource : resources) {
            Classification classification = classify(resource);
            resource.setWasteState(classification != null ? classification.wasteState() : WasteState.NONE);
            resourceRepository.save(resource);

            if (classification == null || protectedResourceIds.contains(resource.getId())) {
                continue;
            }
            created.add(buildCandidate(userId, resource, classification));
        }
        cleanupCandidateRepository.saveAll(created);

        return list(userId, null);
    }

    @Transactional(readOnly = true)
    public List<CleanupCandidateDto> list(UUID userId, CleanupStatus status) {
        OffsetDateTime now = OffsetDateTime.now();
        List<CleanupCandidate> candidates = status != null
                ? cleanupCandidateRepository.findByUserIdAndStatus(userId, status)
                : cleanupCandidateRepository.findByUserIdOrderByEstimatedMonthlySavingsDesc(userId);
        return candidates.stream()
                .filter(c -> !isActiveSnooze(c, now))
                .map(CleanupCandidateDto::from)
                .toList();
    }

    @Transactional
    public ActionResultDto dryRun(UUID userId, UUID candidateId) {
        CleanupCandidate candidate = require(userId, candidateId);
        CloudResource resource = resource(userId, candidate);
        CloudAccount account = account(userId, candidate);

        ActionResult result = invoke(account, resource, candidate.getRecommendedAction(), true);
        if (candidate.getStatus() == CleanupStatus.PENDING) {
            candidate.setStatus(CleanupStatus.DRY_RUN_DONE);
            cleanupCandidateRepository.save(candidate);
        }
        auditService.record(userId, resource, candidate.getRecommendedAction(), "DRY_RUN", true,
                result.success(), result.message(), candidate.getEstimatedMonthlySavings());
        ProviderMode mode = mode(account);
        return new ActionResultDto(result.success(), false, true, mode == ProviderMode.SIMULATED, mode.name(),
                candidate.getRecommendedAction(), candidate.getStatus().name(),
                candidate.getResourceId(), candidate.getResourceName(), result.message());
    }

    @Transactional
    public ActionResultDto execute(UUID userId, UUID candidateId) {
        CleanupCandidate candidate = require(userId, candidateId);
        CloudResource resource = resource(userId, candidate);
        CloudAccount account = account(userId, candidate);

        if (!properties.isRealCloudActions()) {
            String message = "Execution blocked: set ENABLE_REAL_CLOUD_ACTIONS=true to perform destructive "
                    + "actions. Dry-run is always available.";
            auditService.record(userId, resource, candidate.getRecommendedAction(), "EXECUTE", false, false,
                    message, candidate.getEstimatedMonthlySavings());
            return new ActionResultDto(false, false, false, true, ProviderMode.SIMULATED.name(),
                    candidate.getRecommendedAction(), candidate.getStatus().name(),
                    candidate.getResourceId(), candidate.getResourceName(), message);
        }

        ProviderMode mode = mode(account);
        ActionResult result = invoke(account, resource, candidate.getRecommendedAction(), false);
        if (result.success()) {
            candidate.setStatus(CleanupStatus.EXECUTED);
        } else {
            candidate.setStatus(CleanupStatus.FAILED);
        }
        cleanupCandidateRepository.save(candidate);
        auditService.record(userId, resource, candidate.getRecommendedAction(), "EXECUTE", false,
                result.success(), result.message(), candidate.getEstimatedMonthlySavings());
        boolean executed = mode == ProviderMode.REAL && result.success();
        return new ActionResultDto(result.success(), executed, false, mode == ProviderMode.SIMULATED, mode.name(),
                candidate.getRecommendedAction(), candidate.getStatus().name(),
                candidate.getResourceId(), candidate.getResourceName(), result.message());
    }

    @Transactional
    public ActionResultDto ignore(UUID userId, UUID candidateId) {
        CleanupCandidate candidate = require(userId, candidateId);
        candidate.setStatus(CleanupStatus.IGNORED);
        cleanupCandidateRepository.save(candidate);
        CloudResource resource = resource(userId, candidate);
        auditService.record(userId, resource, ActionType.IGNORE, "IGNORE", false, true,
                "Candidate marked as ignored", BigDecimal.ZERO);
        return new ActionResultDto(true, false, false, false, ProviderMode.SIMULATED.name(),
                ActionType.IGNORE, candidate.getStatus().name(),
                candidate.getResourceId(), candidate.getResourceName(), "Candidate ignored");
    }

    @Transactional(readOnly = true)
    public BigDecimal totalPotentialSavings(UUID userId) {
        return cleanupCandidateRepository.findByUserIdAndStatus(userId, CleanupStatus.PENDING).stream()
                .map(CleanupCandidate::getEstimatedMonthlySavings)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional(readOnly = true)
    public long countByStatus(UUID userId, CleanupStatus status) {
        return cleanupCandidateRepository.countByUserIdAndStatus(userId, status);
    }

    // ----- classification ----------------------------------------------------

    private Classification classify(CloudResource resource) {
        ResourceType type = resource.getResourceType();
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        BigDecimal fullCost = fullMonthlyCost(resource);

        if (ResourceTypes.isCompute(type) && status.contains("stopped")) {
            return new Classification(CleanupType.STOPPED_VM, ActionType.TERMINATE, WasteState.STOPPED, fullCost,
                    "Instance has been stopped but still incurs storage/IP charges");
        }
        if (ResourceTypes.isCompute(type) && isRunning(status) && lowCpu(resource, 5.0)) {
            return new Classification(CleanupType.IDLE_VM, ActionType.STOP, WasteState.IDLE, fullCost,
                    "CPU utilization below 5% over the lookback window");
        }
        if (ResourceTypes.isDisk(type) && !isAttached(resource)) {
            return new Classification(CleanupType.UNATTACHED_DISK, ActionType.DELETE_VOLUME, WasteState.UNATTACHED,
                    fullCost, "Volume is not attached to any instance");
        }
        if (ResourceTypes.isIp(type) && !isAssociated(resource)) {
            return new Classification(CleanupType.UNUSED_EIP, ActionType.RELEASE_EIP, WasteState.UNUSED,
                    fullCost, "Elastic IP is allocated but not associated");
        }
        if (ResourceTypes.isSnapshot(type) && ageDays(resource) > 90) {
            return new Classification(CleanupType.OLD_SNAPSHOT, ActionType.DELETE_SNAPSHOT, WasteState.OLD_SNAPSHOT,
                    fullCost, "Snapshot is older than 90 days");
        }
        List<String> missing = TagPolicy.missingTags(resource.getTags());
        if (!missing.isEmpty()) {
            return new Classification(CleanupType.MISSING_TAGS, ActionType.ADD_TAGS, WasteState.NONE,
                    BigDecimal.ZERO, "Missing required tags: " + String.join(", ", missing));
        }
        if (!TagPolicy.hasAnyOwnership(resource.getTags())) {
            return new Classification(CleanupType.ORPHANED_RESOURCE, ActionType.NONE, WasteState.ORPHANED,
                    BigDecimal.ZERO, "Resource has no owner or project and may be orphaned");
        }
        return null;
    }

    private CleanupCandidate buildCandidate(UUID userId, CloudResource resource, Classification c) {
        CleanupCandidate candidate = new CleanupCandidate();
        candidate.setUserId(userId);
        candidate.setResourceId(resource.getId());
        candidate.setCloudAccountId(resource.getCloudAccountId());
        candidate.setProvider(resource.getProvider());
        candidate.setResourceType(resource.getResourceType());
        candidate.setCandidateType(c.type());
        candidate.setReason(c.reason());
        candidate.setEstimatedMonthlySavings(c.savings());
        candidate.setSeverity(severity(c.savings(), c.type()));
        candidate.setStatus(CleanupStatus.PENDING);
        candidate.setRecommendedAction(c.action());
        candidate.setRegion(resource.getRegion());
        candidate.setResourceName(resource.getName());
        candidate.setResourceExternalId(resource.getExternalId());
        candidate.setDetectedAt(OffsetDateTime.now());
        return candidate;
    }

    private ActionResult invoke(CloudAccount account, CloudResource resource, ActionType action, boolean dryRun) {
        if (account == null || resource == null) {
            return dryRun
                    ? ActionResult.ok("Dry run: would " + action)
                    : ActionResult.ok("Executed " + action + " (no live resource)");
        }
        CloudProviderClient client = providerClientFactory.forProvider(account.getProvider());
        return client.executeAction(account, resource, action, dryRun);
    }

    private ProviderMode mode(CloudAccount account) {
        return account != null
                ? providerClientFactory.forProvider(account.getProvider()).actionMode(account)
                : ProviderMode.SIMULATED;
    }

    private boolean isActiveSnooze(CleanupCandidate candidate, OffsetDateTime now) {
        return candidate.getSnoozedUntil() != null && candidate.getSnoozedUntil().isAfter(now);
    }

    private Severity severity(BigDecimal savings, CleanupType type) {
        if (type == CleanupType.MISSING_TAGS || type == CleanupType.ORPHANED_RESOURCE) {
            return Severity.LOW;
        }
        double value = savings != null ? savings.doubleValue() : 0;
        if (value >= 200) {
            return Severity.CRITICAL;
        }
        if (value >= 80) {
            return Severity.HIGH;
        }
        if (value >= 20) {
            return Severity.MEDIUM;
        }
        return Severity.LOW;
    }

    private BigDecimal fullMonthlyCost(CloudResource resource) {
        if (resource.getInstanceType() != null
                && com.cloudmanagerpro.service.provider.InstanceCatalog.isKnown(resource.getInstanceType())) {
            return com.cloudmanagerpro.service.provider.InstanceCatalog.monthlyCost(resource.getInstanceType());
        }
        return resource.getMonthlyCost() != null ? resource.getMonthlyCost() : BigDecimal.ZERO;
    }

    private boolean isRunning(String status) {
        return status.contains("running") || status.contains("available") || status.contains("active");
    }

    private boolean lowCpu(CloudResource resource, double threshold) {
        return resource.getCpuUtilization() != null && resource.getCpuUtilization() < threshold;
    }

    private boolean isAttached(CloudResource resource) {
        Object attached = resource.getMetadata() != null ? resource.getMetadata().get("attached") : null;
        if (attached instanceof Boolean b) {
            return b;
        }
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        return status.contains("in-use") || status.contains("attached");
    }

    private boolean isAssociated(CloudResource resource) {
        Object associated = resource.getMetadata() != null ? resource.getMetadata().get("associated") : null;
        if (associated instanceof Boolean b) {
            return b;
        }
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        return status.contains("associated") || status.contains("in-use");
    }

    private long ageDays(CloudResource resource) {
        Object age = resource.getMetadata() != null ? resource.getMetadata().get("ageDays") : null;
        if (age instanceof Number n) {
            return n.longValue();
        }
        if (resource.getLastActivityAt() != null) {
            return java.time.Duration.between(resource.getLastActivityAt(), OffsetDateTime.now()).toDays();
        }
        return 0;
    }

    private CleanupCandidate require(UUID userId, UUID candidateId) {
        return cleanupCandidateRepository.findByIdAndUserId(candidateId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cleanup candidate not found"));
    }

    private CloudResource resource(UUID userId, CleanupCandidate candidate) {
        if (candidate.getResourceId() == null) {
            return null;
        }
        return resourceRepository.findByIdAndUserId(candidate.getResourceId(), userId).orElse(null);
    }

    private CloudAccount account(UUID userId, CleanupCandidate candidate) {
        if (candidate.getCloudAccountId() == null) {
            return null;
        }
        return cloudAccountRepository.findByIdAndUserId(candidate.getCloudAccountId(), userId).orElse(null);
    }

    private void addIfNotNull(Set<UUID> set, UUID value) {
        if (value != null) {
            set.add(value);
        }
    }

    private record Classification(
            CleanupType type,
            ActionType action,
            WasteState wasteState,
            BigDecimal savings,
            String reason
    ) {
    }
}
