package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.dto.actions.ApplyRequest;
import com.cloudmanagerpro.dto.rightsizing.RightsizingSummaryDto;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.rightsizing.RightsizingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/rightsizing")
@RequiredArgsConstructor
public class RightsizingController {

    private final RightsizingService rightsizingService;
    private final CurrentUser currentUser;

    @GetMapping
    public RightsizingSummaryDto list() {
        return rightsizingService.summary(currentUser.id());
    }

    @PostMapping("/analyze")
    public RightsizingSummaryDto analyze() {
        rightsizingService.analyze(currentUser.id());
        return rightsizingService.summary(currentUser.id());
    }

    @PostMapping("/{id}/apply")
    public ActionResultDto apply(@PathVariable UUID id, @RequestBody(required = false) ApplyRequest request) {
        return rightsizingService.apply(currentUser.id(), id, request);
    }
}
