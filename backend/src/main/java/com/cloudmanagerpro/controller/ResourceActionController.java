package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.dto.actions.ActionRequest;
import com.cloudmanagerpro.dto.actions.BulkActionRequest;
import com.cloudmanagerpro.dto.actions.BulkActionResultDto;
import com.cloudmanagerpro.dto.actions.ResourceActionsDto;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.actions.ResourceActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Unified resource-action API. Dry-run is always allowed; execute honours the two-layer safety gate
 * and returns a structured result ({@code providerMode}, {@code simulated}, {@code executed}) so the
 * frontend can clearly label simulated vs real outcomes. Every endpoint is tenant-scoped.
 */
@RestController
@RequiredArgsConstructor
public class ResourceActionController {

    private final ResourceActionService resourceActionService;
    private final CurrentUser currentUser;

    @GetMapping("/resources/{id}/actions")
    public ResourceActionsDto actions(@PathVariable UUID id) {
        return resourceActionService.listActions(currentUser.id(), id);
    }

    @PostMapping("/resources/{id}/actions/dry-run")
    public ActionResultDto dryRun(@PathVariable UUID id, @RequestBody ActionRequest request) {
        return resourceActionService.dryRun(currentUser.id(), id, request);
    }

    @PostMapping("/resources/{id}/actions/execute")
    public ActionResultDto execute(@PathVariable UUID id, @RequestBody ActionRequest request) {
        return resourceActionService.execute(currentUser.id(), id, request);
    }

    @PostMapping("/actions/bulk/dry-run")
    public BulkActionResultDto bulkDryRun(@RequestBody BulkActionRequest request) {
        return resourceActionService.bulkDryRun(currentUser.id(), request);
    }

    @PostMapping("/actions/bulk/execute")
    public BulkActionResultDto bulkExecute(@RequestBody BulkActionRequest request) {
        return resourceActionService.bulkExecute(currentUser.id(), request);
    }
}
