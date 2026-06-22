package com.cloudmanagerpro.service;

import com.cloudmanagerpro.dto.PageResponse;
import com.cloudmanagerpro.dto.logs.ActionLogDto;
import com.cloudmanagerpro.dto.logs.AlertLogDto;
import com.cloudmanagerpro.dto.sync.SyncJobDto;
import com.cloudmanagerpro.repository.ActionLogRepository;
import com.cloudmanagerpro.repository.AlertLogRepository;
import com.cloudmanagerpro.repository.SyncJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LogService {

    private final ActionLogRepository actionLogRepository;
    private final AlertLogRepository alertLogRepository;
    private final SyncJobRepository syncJobRepository;

    @Transactional(readOnly = true)
    public PageResponse<ActionLogDto> actions(UUID userId, Pageable pageable) {
        return PageResponse.from(actionLogRepository.findByUserId(userId, pageable), ActionLogDto::from);
    }

    @Transactional(readOnly = true)
    public PageResponse<SyncJobDto> sync(UUID userId, Pageable pageable) {
        return PageResponse.from(syncJobRepository.findByUserId(userId, pageable), SyncJobDto::from);
    }

    @Transactional(readOnly = true)
    public PageResponse<AlertLogDto> alerts(UUID userId, Pageable pageable) {
        return PageResponse.from(alertLogRepository.findByUserId(userId, pageable), AlertLogDto::from);
    }
}
