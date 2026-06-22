package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.dto.cleanup.CleanupCandidateDto;
import com.cloudmanagerpro.model.enums.CleanupStatus;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.cleanup.CleanupService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/cleanup")
@RequiredArgsConstructor
public class CleanupController {

    private final CleanupService cleanupService;
    private final CurrentUser currentUser;

    @GetMapping("/candidates")
    public List<CleanupCandidateDto> candidates(@RequestParam(required = false) CleanupStatus status) {
        return cleanupService.list(currentUser.id(), status);
    }

    @PostMapping("/analyze")
    public List<CleanupCandidateDto> analyze() {
        return cleanupService.analyze(currentUser.id());
    }

    @PostMapping("/{id}/dry-run")
    public ActionResultDto dryRun(@PathVariable UUID id) {
        return cleanupService.dryRun(currentUser.id(), id);
    }

    @PostMapping("/{id}/execute")
    public ActionResultDto execute(@PathVariable UUID id) {
        return cleanupService.execute(currentUser.id(), id);
    }

    @PostMapping("/{id}/ignore")
    public ActionResultDto ignore(@PathVariable UUID id) {
        return cleanupService.ignore(currentUser.id(), id);
    }
}
