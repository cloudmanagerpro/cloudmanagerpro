package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.TagComplianceResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TagComplianceResultRepository extends JpaRepository<TagComplianceResult, UUID> {

    List<TagComplianceResult> findByUserId(UUID userId);

    List<TagComplianceResult> findByUserIdAndCompliantFalse(UUID userId);

    long countByUserId(UUID userId);

    long countByUserIdAndCompliantTrue(UUID userId);

    void deleteByUserId(UUID userId);

    void deleteByCloudAccountId(UUID cloudAccountId);
}
