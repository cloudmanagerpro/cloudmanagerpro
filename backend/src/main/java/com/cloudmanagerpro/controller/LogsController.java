package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.PageResponse;
import com.cloudmanagerpro.dto.logs.ActionLogDto;
import com.cloudmanagerpro.dto.logs.AlertLogDto;
import com.cloudmanagerpro.dto.sync.SyncJobDto;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/logs")
@RequiredArgsConstructor
public class LogsController {

    private final LogService logService;
    private final CurrentUser currentUser;

    @GetMapping("/actions")
    public PageResponse<ActionLogDto> actions(@RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return logService.actions(currentUser.id(), pageable(page, size));
    }

    @GetMapping("/sync")
    public PageResponse<SyncJobDto> sync(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return logService.sync(currentUser.id(), pageable(page, size));
    }

    @GetMapping("/alerts")
    public PageResponse<AlertLogDto> alerts(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return logService.alerts(currentUser.id(), pageable(page, size));
    }

    private PageRequest pageable(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
    }
}
