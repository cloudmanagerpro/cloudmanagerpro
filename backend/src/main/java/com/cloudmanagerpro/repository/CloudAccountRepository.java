package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.CloudAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CloudAccountRepository extends JpaRepository<CloudAccount, UUID> {

    List<CloudAccount> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<CloudAccount> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);
}
