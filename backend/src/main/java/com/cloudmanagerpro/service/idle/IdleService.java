package com.cloudmanagerpro.service.idle;

import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.dto.actions.ApplyRequest;
import com.cloudmanagerpro.dto.idle.IdleCandidateDto;
import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.IdleCandidate;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.IdleReason;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.Severity;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import com.cloudmanagerpro.repository.IdleCandidateRepository;
import com.cloudmanagerpro.service.ResourceTypes;
import com.cloudmanagerpro.service.actions.RecommendationStatus;
import com.cloudmanagerpro.service.actions.ResourceActionService;
import com.cloudmanagerpro.service.provider.ActionParams;
import com.cloudmanagerpro.service.provider.InstanceCatalog;
import com.cloudmanagerpro.service.tags.TagPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Identifies idle/abandoned resources with a reason code and severity. */
@Service
@RequiredArgsConstructor
public class IdleService {

    private static final double LOW_NETWORK_BYTES = 1_000_000.0;
    private static final double LOW_DISK_BYTES = 500_000.0;

    private final CloudResourceRepository resourceRepository;
    private final IdleCandidateRepository idleCandidateRepository;
    private final ResourceActionService resourceActionService;

    @Transactional
    public List<IdleCandidateDto> analyze(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now();
        List<IdleCandidate> existing = idleCandidateRepository.findByUserId(userId);

        // Preserve user intent: keep dismissed and actively-snoozed candidates, refresh the rest.
        Set<UUID> protectedResourceIds = new HashSet<>();
        for (IdleCandidate candidate : existing) {
            if (isProtected(candidate, now)) {
                if (candidate.getResourceId() != null) {
                    protectedResourceIds.add(candidate.getResourceId());
                }
            } else {
                idleCandidateRepository.delete(candidate);
            }
        }

        List<CloudResource> resources = resourceRepository.findByUserId(userId);
        List<IdleCandidate> created = new ArrayList<>();
        for (CloudResource resource : resources) {
            if (resource.getId() != null && protectedResourceIds.contains(resource.getId())) {
                continue;
            }
            IdleReason reason = detectReason(resource);
            if (reason != null) {
                created.add(build(userId, resource, reason));
            }
        }
        idleCandidateRepository.saveAll(created);
        return list(userId);
    }

    @Transactional(readOnly = true)
    public List<IdleCandidateDto> list(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now();
        return idleCandidateRepository.findByUserIdOrderByEstimatedMonthlySavingsDesc(userId).stream()
                .filter(candidate -> isVisible(candidate, now))
                .map(IdleCandidateDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public long count(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now();
        return idleCandidateRepository.findByUserId(userId).stream()
                .filter(candidate -> isVisible(candidate, now))
                .count();
    }

    /** Apply the natural action for an idle candidate (stop running compute, or the linked cleanup action). */
    @Transactional
    public ActionResultDto apply(UUID userId, UUID candidateId, ApplyRequest request) {
        ApplyRequest req = request != null ? request : new ApplyRequest(null, false, null);
        IdleCandidate candidate = idleCandidateRepository.findByIdAndUserId(candidateId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Idle candidate not found"));
        CloudResource resource = resourceRepository.findByIdAndUserId(candidate.getResourceId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource for idle candidate not found"));
        ActionType action = idleAction(resource);
        ActionResultDto result = resourceActionService.runActionById(userId, resource.getId(), action,
                ActionParams.empty(), req.dryRun(), req.confirmation(), candidate.getEstimatedMonthlySavings());
        if (!req.dryRun() && result.executed()) {
            candidate.setStatus(RecommendationStatus.DISMISSED);
            idleCandidateRepository.save(candidate);
        }
        return result;
    }

    private ActionType idleAction(CloudResource resource) {
        ResourceType type = resource.getResourceType();
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        if (ResourceTypes.isCompute(type)) {
            return (status.contains("stop") || status.contains("dealloc")) ? ActionType.TERMINATE : ActionType.STOP;
        }
        if (ResourceTypes.isDisk(type)) {
            return ActionType.DELETE_VOLUME;
        }
        if (ResourceTypes.isIp(type)) {
            return ActionType.RELEASE_EIP;
        }
        if (ResourceTypes.isSnapshot(type)) {
            return ActionType.DELETE_SNAPSHOT;
        }
        return ActionType.STOP;
    }

    private boolean isProtected(IdleCandidate candidate, OffsetDateTime now) {
        return RecommendationStatus.DISMISSED.equals(candidate.getStatus()) || isActiveSnooze(candidate, now);
    }

    private boolean isVisible(IdleCandidate candidate, OffsetDateTime now) {
        if (RecommendationStatus.DISMISSED.equals(candidate.getStatus())) {
            return false;
        }
        return !isActiveSnooze(candidate, now);
    }

    private boolean isActiveSnooze(IdleCandidate candidate, OffsetDateTime now) {
        return RecommendationStatus.SNOOZED.equals(candidate.getStatus())
                && candidate.getSnoozedUntil() != null && candidate.getSnoozedUntil().isAfter(now);
    }

    private IdleReason detectReason(CloudResource resource) {
        ResourceType type = resource.getResourceType();
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        Double cpu = resource.getCpuUtilization();

        if (ResourceTypes.isCompute(type)) {
            if (status.contains("stopped")) {
                return IdleReason.STOPPED_IDLE;
            }
            if (cpu != null && cpu < 5.0) {
                return IdleReason.LOW_CPU;
            }
            if (cpu != null && cpu < 10.0 && low(resource.getNetworkInBytes(), LOW_NETWORK_BYTES)) {
                return IdleReason.NO_NETWORK;
            }
            if (cpu != null && cpu < 10.0 && low(resource.getDiskIoBytes(), LOW_DISK_BYTES)) {
                return IdleReason.NO_DISK_IO;
            }
        }
        if (ResourceTypes.isDisk(type) && !isAttached(resource)) {
            return IdleReason.UNATTACHED;
        }
        if (!TagPolicy.hasAnyOwnership(resource.getTags()) && isStale(resource, 45)) {
            return IdleReason.ABANDONED;
        }
        return null;
    }

    private IdleCandidate build(UUID userId, CloudResource resource, IdleReason reason) {
        BigDecimal savings = fullMonthlyCost(resource);
        IdleCandidate candidate = new IdleCandidate();
        candidate.setUserId(userId);
        candidate.setResourceId(resource.getId());
        candidate.setCloudAccountId(resource.getCloudAccountId());
        candidate.setProvider(resource.getProvider());
        candidate.setResourceType(resource.getResourceType());
        candidate.setReason(reason);
        candidate.setSeverity(severity(savings));
        candidate.setCpuUtilization(resource.getCpuUtilization());
        candidate.setEstimatedMonthlySavings(savings);
        candidate.setIdleSince(resource.getLastActivityAt() != null
                ? resource.getLastActivityAt()
                : OffsetDateTime.now().minusDays(30));
        candidate.setRegion(resource.getRegion());
        candidate.setResourceName(resource.getName());
        candidate.setDetectedAt(OffsetDateTime.now());
        return candidate;
    }

    private Severity severity(BigDecimal savings) {
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
        if (resource.getInstanceType() != null && InstanceCatalog.isKnown(resource.getInstanceType())) {
            return InstanceCatalog.monthlyCost(resource.getInstanceType());
        }
        return resource.getMonthlyCost() != null ? resource.getMonthlyCost() : BigDecimal.ZERO;
    }

    private boolean low(Double value, double threshold) {
        return value == null || value < threshold;
    }

    private boolean isAttached(CloudResource resource) {
        Object attached = resource.getMetadata() != null ? resource.getMetadata().get("attached") : null;
        if (attached instanceof Boolean b) {
            return b;
        }
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        return status.contains("in-use") || status.contains("attached");
    }

    private boolean isStale(CloudResource resource, int days) {
        return resource.getLastActivityAt() != null
                && resource.getLastActivityAt().isBefore(OffsetDateTime.now().minusDays(days));
    }
}
