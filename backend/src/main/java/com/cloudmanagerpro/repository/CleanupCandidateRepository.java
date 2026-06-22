package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.CleanupCandidate;
import com.cloudmanagerpro.model.enums.CleanupStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CleanupCandidateRepository extends JpaRepository<CleanupCandidate, UUID> {

    List<CleanupCandidate> findByUserIdOrderByEstimatedMonthlySavingsDesc(UUID userId);

    List<CleanupCandidate> findByUserIdAndStatus(UUID userId, CleanupStatus status);

    Optional<CleanupCandidate> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndStatus(UUID userId, CleanupStatus status);

    void deleteByUserIdAndStatus(UUID userId, CleanupStatus status);

    void deleteByCloudAccountId(UUID cloudAccountId);
}
