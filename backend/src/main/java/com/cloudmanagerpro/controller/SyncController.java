package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.PageResponse;
import com.cloudmanagerpro.dto.sync.SyncJobDto;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.CloudAccountService;
import com.cloudmanagerpro.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;
    private final CloudAccountService cloudAccountService;
    private final CurrentUser currentUser;

    @PostMapping("/{cloudAccountId}")
    public SyncJobDto sync(@PathVariable UUID cloudAccountId) {
        return cloudAccountService.sync(currentUser.id(), cloudAccountId);
    }

    @GetMapping("/jobs")
    public PageResponse<SyncJobDto> jobs(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.from(syncService.getJobs(currentUser.id(), pageable), SyncJobDto::from);
    }

    @GetMapping("/jobs/{id}")
    public SyncJobDto job(@PathVariable UUID id) {
        return SyncJobDto.from(syncService.getJob(id, currentUser.id()));
    }
}
