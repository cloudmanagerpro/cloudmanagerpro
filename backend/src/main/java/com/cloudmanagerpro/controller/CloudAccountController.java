package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.cloudaccount.CloudAccountDto;
import com.cloudmanagerpro.dto.cloudaccount.ConnectionTestDto;
import com.cloudmanagerpro.dto.cloudaccount.CreateCloudAccountRequest;
import com.cloudmanagerpro.dto.sync.SyncJobDto;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.CloudAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/cloud-accounts")
@RequiredArgsConstructor
public class CloudAccountController {

    private final CloudAccountService cloudAccountService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<CloudAccountDto> list() {
        return cloudAccountService.list(currentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CloudAccountDto create(@Valid @RequestBody CreateCloudAccountRequest request) {
        return cloudAccountService.create(currentUser.id(), request);
    }

    @GetMapping("/{id}")
    public CloudAccountDto get(@PathVariable UUID id) {
        return cloudAccountService.get(currentUser.id(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        cloudAccountService.delete(currentUser.id(), id);
    }

    @PostMapping("/{id}/test")
    public ConnectionTestDto test(@PathVariable UUID id) {
        return cloudAccountService.test(currentUser.id(), id);
    }

    @PostMapping("/{id}/sync")
    public SyncJobDto sync(@PathVariable UUID id) {
        return cloudAccountService.sync(currentUser.id(), id);
    }
}
