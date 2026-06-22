package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.IdleCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdleCandidateRepository extends JpaRepository<IdleCandidate, UUID> {

    List<IdleCandidate> findByUserIdOrderByEstimatedMonthlySavingsDesc(UUID userId);

    List<IdleCandidate> findByUserId(UUID userId);

    Optional<IdleCandidate> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    void deleteByUserId(UUID userId);

    void deleteByCloudAccountId(UUID cloudAccountId);
}
