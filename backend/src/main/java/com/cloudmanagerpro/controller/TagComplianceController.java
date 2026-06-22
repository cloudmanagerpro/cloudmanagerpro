package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.tags.TagComplianceSummaryDto;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.tags.TagComplianceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tags")
@RequiredArgsConstructor
public class TagComplianceController {

    private final TagComplianceService tagComplianceService;
    private final CurrentUser currentUser;

    @GetMapping("/compliance")
    public TagComplianceSummaryDto compliance() {
        return tagComplianceService.summary(currentUser.id());
    }

    @PostMapping("/analyze")
    public TagComplianceSummaryDto analyze() {
        return tagComplianceService.analyze(currentUser.id());
    }
}
