package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.AlertLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlertLogRepository extends JpaRepository<AlertLog, UUID> {

    Page<AlertLog> findByUserId(UUID userId, Pageable pageable);

    List<AlertLog> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);
}
