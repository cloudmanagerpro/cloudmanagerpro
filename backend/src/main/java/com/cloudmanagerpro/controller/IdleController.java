package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.dto.actions.ApplyRequest;
import com.cloudmanagerpro.dto.idle.IdleCandidateDto;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.idle.IdleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/idle")
@RequiredArgsConstructor
public class IdleController {

    private final IdleService idleService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<IdleCandidateDto> list() {
        return idleService.list(currentUser.id());
    }

    @PostMapping("/analyze")
    public List<IdleCandidateDto> analyze() {
        return idleService.analyze(currentUser.id());
    }

    @PostMapping("/{id}/apply")
    public ActionResultDto apply(@PathVariable UUID id, @RequestBody(required = false) ApplyRequest request) {
        return idleService.apply(currentUser.id(), id, request);
    }
}
