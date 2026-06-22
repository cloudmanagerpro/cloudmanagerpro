package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.RightsizingRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RightsizingRecommendationRepository extends JpaRepository<RightsizingRecommendation, UUID> {

    List<RightsizingRecommendation> findByUserIdOrderByEstimatedMonthlySavingsDesc(UUID userId);

    List<RightsizingRecommendation> findByUserId(UUID userId);

    Optional<RightsizingRecommendation> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    void deleteByUserId(UUID userId);

    void deleteByCloudAccountId(UUID cloudAccountId);
}
