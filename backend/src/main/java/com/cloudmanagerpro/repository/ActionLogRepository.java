package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.ActionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ActionLogRepository extends JpaRepository<ActionLog, UUID> {

    Page<ActionLog> findByUserId(UUID userId, Pageable pageable);
}
