package com.cloudmanagerpro.service.rightsizing;

import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.dto.actions.ApplyRequest;
import com.cloudmanagerpro.dto.rightsizing.RightsizingDto;
import com.cloudmanagerpro.dto.rightsizing.RightsizingSummaryDto;
import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.RightsizingRecommendation;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.Confidence;
import com.cloudmanagerpro.model.enums.WasteState;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import com.cloudmanagerpro.repository.RightsizingRecommendationRepository;
import com.cloudmanagerpro.service.ResourceTypes;
import com.cloudmanagerpro.service.actions.RecommendationStatus;
import com.cloudmanagerpro.service.actions.ResourceActionService;
import com.cloudmanagerpro.service.provider.ActionParams;
import com.cloudmanagerpro.service.provider.InstanceCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Rightsizing engine: instances averaging &lt;20% CPU over 14 days are recommended one tier smaller,
 * &lt;5% two tiers smaller, with a confidence level and projected savings.
 */
@Service
@RequiredArgsConstructor
public class RightsizingService {

    private static final int LOOKBACK_DAYS = 14;

    private final CloudResourceRepository resourceRepository;
    private final RightsizingRecommendationRepository recommendationRepository;
    private final ResourceActionService resourceActionService;

    @Transactional
    public List<RightsizingDto> analyze(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now();
        List<RightsizingRecommendation> existing = recommendationRepository.findByUserId(userId);

        // Preserve user intent: keep dismissed and actively-snoozed recommendations, refresh the rest.
        Set<UUID> protectedResourceIds = new HashSet<>();
        for (RightsizingRecommendation recommendation : existing) {
            if (isProtected(recommendation, now)) {
                if (recommendation.getResourceId() != null) {
                    protectedResourceIds.add(recommendation.getResourceId());
                }
            } else {
                recommendationRepository.delete(recommendation);
            }
        }

        List<CloudResource> resources = resourceRepository.findByUserId(userId);
        List<RightsizingRecommendation> created = new ArrayList<>();
        for (CloudResource resource : resources) {
            if (resource.getId() != null && protectedResourceIds.contains(resource.getId())) {
                continue;
            }
            RightsizingRecommendation recommendation = evaluate(userId, resource);
            if (recommendation != null) {
                created.add(recommendation);
                if (resource.getWasteState() == WasteState.NONE) {
                    resource.setWasteState(WasteState.UNDERUTILIZED);
                    resourceRepository.save(resource);
                }
            }
        }
        recommendationRepository.saveAll(created);
        return list(userId);
    }

    @Transactional(readOnly = true)
    public List<RightsizingDto> list(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now();
        return recommendationRepository.findByUserIdOrderByEstimatedMonthlySavingsDesc(userId).stream()
                .filter(recommendation -> isVisible(recommendation, now))
                .map(RightsizingDto::from)
                .toList();
    }

    /** Apply a rightsizing recommendation as a RESIZE (dry-run preview or execute) via the shared action path. */
    @Transactional
    public ActionResultDto apply(UUID userId, UUID recommendationId, ApplyRequest request) {
        ApplyRequest req = request != null ? request : new ApplyRequest(null, false, null);
        RightsizingRecommendation recommendation = recommendationRepository.findByIdAndUserId(recommendationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Rightsizing recommendation not found"));
        String instanceType = StringUtils.hasText(req.instanceType())
                ? req.instanceType()
                : recommendation.getRecommendedType();
        ActionResultDto result = resourceActionService.runActionById(userId, recommendation.getResourceId(),
                ActionType.RESIZE, ActionParams.ofInstanceType(instanceType), req.dryRun(), req.confirmation(),
                recommendation.getEstimatedMonthlySavings());
        if (!req.dryRun() && result.executed()) {
            recommendation.setStatus(RecommendationStatus.APPLIED);
            recommendationRepository.save(recommendation);
        }
        return result;
    }

    private boolean isProtected(RightsizingRecommendation recommendation, OffsetDateTime now) {
        return RecommendationStatus.DISMISSED.equals(recommendation.getStatus()) || isActiveSnooze(recommendation, now);
    }

    private boolean isVisible(RightsizingRecommendation recommendation, OffsetDateTime now) {
        if (RecommendationStatus.DISMISSED.equals(recommendation.getStatus())) {
            return false;
        }
        return !isActiveSnooze(recommendation, now);
    }

    private boolean isActiveSnooze(RightsizingRecommendation recommendation, OffsetDateTime now) {
        return RecommendationStatus.SNOOZED.equals(recommendation.getStatus())
                && recommendation.getSnoozedUntil() != null && recommendation.getSnoozedUntil().isAfter(now);
    }

    @Transactional(readOnly = true)
    public RightsizingSummaryDto summary(UUID userId) {
        List<RightsizingDto> recommendations = list(userId);
        BigDecimal total = recommendations.stream()
                .map(RightsizingDto::estimatedMonthlySavings)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new RightsizingSummaryDto(recommendations.size(), total, recommendations);
    }

    @Transactional(readOnly = true)
    public BigDecimal totalPotentialSavings(UUID userId) {
        return recommendationRepository.findByUserIdOrderByEstimatedMonthlySavingsDesc(userId).stream()
                .map(RightsizingRecommendation::getEstimatedMonthlySavings)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private RightsizingRecommendation evaluate(UUID userId, CloudResource resource) {
        if (!ResourceTypes.isRightsizeable(resource.getResourceType())) {
            return null;
        }
        String currentType = resource.getInstanceType();
        Double cpu = resource.getCpuUtilization();
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        if (currentType == null || !InstanceCatalog.isKnown(currentType) || cpu == null) {
            return null;
        }
        if (status.contains("stopped")) {
            return null;
        }

        int steps;
        Confidence confidence;
        if (cpu < 5.0) {
            steps = 2;
            confidence = Confidence.HIGH;
        } else if (cpu < 20.0) {
            steps = 1;
            confidence = Confidence.MEDIUM;
        } else {
            return null;
        }

        String recommendedType = InstanceCatalog.smaller(currentType, steps);
        if (recommendedType.equals(currentType)) {
            return null;
        }
        BigDecimal currentCost = InstanceCatalog.monthlyCost(currentType);
        BigDecimal projectedCost = InstanceCatalog.monthlyCost(recommendedType);
        BigDecimal savings = currentCost.subtract(projectedCost);
        if (savings.signum() <= 0) {
            return null;
        }
        double maxCpu = Math.min(100.0, cpu * 1.6 + 5.0);

        RightsizingRecommendation recommendation = new RightsizingRecommendation();
        recommendation.setUserId(userId);
        recommendation.setResourceId(resource.getId());
        recommendation.setCloudAccountId(resource.getCloudAccountId());
        recommendation.setProvider(resource.getProvider());
        recommendation.setResourceType(resource.getResourceType());
        recommendation.setResourceName(resource.getName());
        recommendation.setRegion(resource.getRegion());
        recommendation.setCurrentType(currentType);
        recommendation.setRecommendedType(recommendedType);
        recommendation.setCurrentMonthlyCost(currentCost);
        recommendation.setProjectedMonthlyCost(projectedCost);
        recommendation.setEstimatedMonthlySavings(savings.setScale(2, RoundingMode.HALF_UP));
        recommendation.setAvgCpuUtilization(round(cpu));
        recommendation.setMaxCpuUtilization(round(maxCpu));
        recommendation.setConfidence(confidence);
        recommendation.setLookbackDays(LOOKBACK_DAYS);
        recommendation.setStatus("OPEN");
        recommendation.setReason(String.format(
                "Average CPU %.1f%% over %d days; downsize %s -> %s saves $%.2f/mo",
                cpu, LOOKBACK_DAYS, currentType, recommendedType, savings));
        return recommendation;
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
