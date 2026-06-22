package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.enums.WasteState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CloudResourceRepository extends JpaRepository<CloudResource, UUID>,
        JpaSpecificationExecutor<CloudResource> {

    List<CloudResource> findByUserId(UUID userId);

    Optional<CloudResource> findByIdAndUserId(UUID id, UUID userId);

    List<CloudResource> findByUserIdAndCloudAccountId(UUID userId, UUID cloudAccountId);

    Optional<CloudResource> findByCloudAccountIdAndExternalId(UUID cloudAccountId, String externalId);

    long countByUserId(UUID userId);

    long countByUserIdAndWasteStateNot(UUID userId, WasteState wasteState);

    long countByCloudAccountId(UUID cloudAccountId);

    void deleteByCloudAccountId(UUID cloudAccountId);

    /** Removes a user's resources whose owning account no longer exists (orphan/stale-demo cleanup). */
    void deleteByUserIdAndCloudAccountIdNotIn(UUID userId, Collection<UUID> cloudAccountIds);
}
