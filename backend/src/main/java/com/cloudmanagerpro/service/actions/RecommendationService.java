package com.cloudmanagerpro.service.actions;

import com.cloudmanagerpro.dto.actions.RecommendationUpdateDto;
import com.cloudmanagerpro.dto.actions.SnoozeRequest;
import com.cloudmanagerpro.exception.BadRequestException;
import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.model.CleanupCandidate;
import com.cloudmanagerpro.model.IdleCandidate;
import com.cloudmanagerpro.model.RightsizingRecommendation;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.CleanupStatus;
import com.cloudmanagerpro.repository.CleanupCandidateRepository;
import com.cloudmanagerpro.repository.IdleCandidateRepository;
import com.cloudmanagerpro.repository.RightsizingRecommendationRepository;
import com.cloudmanagerpro.service.audit.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Snooze / dismiss lifecycle for the recommendation engines (idle, rightsizing, cleanup).
 * Idle/rightsizing carry a string status + {@code snoozedUntil}; cleanup keeps its
 * {@link CleanupStatus} enum (dismiss maps to {@code IGNORED}) and uses {@code snoozedUntil} for snooze.
 * {@code tag} is accepted as a graceful no-op (tag-compliance findings have no snooze/dismiss model) so
 * the unified recommendation menu never 400s; any other type is rejected. Every endpoint is
 * tenant-scoped; cross-tenant ids return 404.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final int DEFAULT_SNOOZE_DAYS = 7;

    private final IdleCandidateRepository idleCandidateRepository;
    private final RightsizingRecommendationRepository rightsizingRecommendationRepository;
    private final CleanupCandidateRepository cleanupCandidateRepository;
    private final AuditService auditService;

    @Transactional
    public RecommendationUpdateDto snooze(UUID userId, String type, UUID id, SnoozeRequest request) {
        OffsetDateTime until = resolveUntil(request);
        String message = "Snoozed until " + until;
        switch (normalize(type)) {
            case "idle" -> {
                IdleCandidate candidate = idleCandidateRepository.findByIdAndUserId(id, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Idle candidate not found"));
                candidate.setStatus(RecommendationStatus.SNOOZED);
                candidate.setSnoozedUntil(until);
                idleCandidateRepository.save(candidate);
            }
            case "rightsizing" -> {
                RightsizingRecommendation recommendation = rightsizingRecommendationRepository
                        .findByIdAndUserId(id, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Rightsizing recommendation not found"));
                recommendation.setStatus(RecommendationStatus.SNOOZED);
                recommendation.setSnoozedUntil(until);
                rightsizingRecommendationRepository.save(recommendation);
            }
            case "cleanup" -> {
                CleanupCandidate candidate = cleanupCandidateRepository.findByIdAndUserId(id, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Cleanup candidate not found"));
                candidate.setSnoozedUntil(until);
                cleanupCandidateRepository.save(candidate);
            }
            case "tag" -> {
                // Tag-compliance findings have no snooze persistence model; accept the request as a
                // graceful no-op so the unified recommendation menu never returns a 400.
            }
            default -> throw unsupported(type);
        }
        auditService.record(userId, null, ActionType.NONE, "SNOOZE", false, true, type + " " + message, BigDecimal.ZERO);
        return new RecommendationUpdateDto(true, normalize(type), id, RecommendationStatus.SNOOZED, until, message);
    }

    @Transactional
    public RecommendationUpdateDto dismiss(UUID userId, String type, UUID id) {
        String status;
        switch (normalize(type)) {
            case "idle" -> {
                IdleCandidate candidate = idleCandidateRepository.findByIdAndUserId(id, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Idle candidate not found"));
                candidate.setStatus(RecommendationStatus.DISMISSED);
                candidate.setSnoozedUntil(null);
                idleCandidateRepository.save(candidate);
                status = RecommendationStatus.DISMISSED;
            }
            case "rightsizing" -> {
                RightsizingRecommendation recommendation = rightsizingRecommendationRepository
                        .findByIdAndUserId(id, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Rightsizing recommendation not found"));
                recommendation.setStatus(RecommendationStatus.DISMISSED);
                recommendation.setSnoozedUntil(null);
                rightsizingRecommendationRepository.save(recommendation);
                status = RecommendationStatus.DISMISSED;
            }
            case "cleanup" -> {
                CleanupCandidate candidate = cleanupCandidateRepository.findByIdAndUserId(id, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Cleanup candidate not found"));
                candidate.setStatus(CleanupStatus.IGNORED);
                candidate.setSnoozedUntil(null);
                cleanupCandidateRepository.save(candidate);
                status = CleanupStatus.IGNORED.name();
            }
            case "tag" -> {
                // No tag-dismiss model; accept as a graceful no-op (mirrors snooze) so the menu never 400s.
                status = RecommendationStatus.DISMISSED;
            }
            default -> throw unsupported(type);
        }
        auditService.record(userId, null, ActionType.IGNORE, "DISMISS", false, true,
                "Dismissed " + normalize(type) + " recommendation", BigDecimal.ZERO);
        return new RecommendationUpdateDto(true, normalize(type), id, status, null, "Recommendation dismissed");
    }

    private OffsetDateTime resolveUntil(SnoozeRequest request) {
        OffsetDateTime now = OffsetDateTime.now();
        if (request != null && request.until() != null) {
            if (!request.until().isAfter(now)) {
                throw new BadRequestException("Snooze 'until' must be in the future");
            }
            return request.until();
        }
        int days = request != null && request.days() != null ? request.days() : DEFAULT_SNOOZE_DAYS;
        if (days <= 0) {
            throw new BadRequestException("Snooze 'days' must be a positive number");
        }
        return now.plusDays(days);
    }

    private String normalize(String type) {
        return type != null ? type.trim().toLowerCase() : "";
    }

    private BadRequestException unsupported(String type) {
        return new BadRequestException("Unsupported recommendation type: " + type
                + " (expected idle, rightsizing or cleanup)");
    }
}
