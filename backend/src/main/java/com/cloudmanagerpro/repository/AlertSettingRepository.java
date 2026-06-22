package com.cloudmanagerpro.repository;

import com.cloudmanagerpro.model.AlertSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlertSettingRepository extends JpaRepository<AlertSetting, UUID> {

    Optional<AlertSetting> findByUserId(UUID userId);
}
