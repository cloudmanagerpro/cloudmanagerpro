package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.SyncJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SyncJobRepository extends JpaRepository<SyncJob, UUID> {

    Page<SyncJob> findByUserId(UUID userId, Pageable pageable);

    List<SyncJob> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<SyncJob> findByIdAndUserId(UUID id, UUID userId);

    void deleteByCloudAccountId(UUID cloudAccountId);
}
