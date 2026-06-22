package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.CostDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface CostDailyRepository extends JpaRepository<CostDaily, UUID> {

    List<CostDaily> findByUserIdAndUsageDateBetween(UUID userId, LocalDate start, LocalDate end);

    List<CostDaily> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    boolean existsByUserIdAndUsageDate(UUID userId, LocalDate usageDate);

    void deleteByCloudAccountId(UUID cloudAccountId);

    /** Removes a user's cost rows whose owning account no longer exists (orphan/stale-demo cleanup). */
    void deleteByUserIdAndCloudAccountIdNotIn(UUID userId, Collection<UUID> cloudAccountIds);
}
