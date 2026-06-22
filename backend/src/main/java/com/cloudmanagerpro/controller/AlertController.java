package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.alerts.AlertSettingDto;
import com.cloudmanagerpro.dto.alerts.AlertTestResultDto;
import com.cloudmanagerpro.dto.alerts.TestEmailRequest;
import com.cloudmanagerpro.dto.alerts.TestSlackRequest;
import com.cloudmanagerpro.dto.alerts.UpdateAlertSettingRequest;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.alerts.AlertService;
import com.cloudmanagerpro.service.alerts.AlertSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AlertController {

    private final AlertSettingService alertSettingService;
    private final AlertService alertService;
    private final CurrentUser currentUser;

    @GetMapping("/settings/alerts")
    public AlertSettingDto getSettings() {
        return alertSettingService.get(currentUser.id());
    }

    @PutMapping("/settings/alerts")
    public AlertSettingDto updateSettings(@RequestBody UpdateAlertSettingRequest request) {
        return alertSettingService.update(currentUser.id(), request);
    }

    @PostMapping("/alerts/test-slack")
    public AlertTestResultDto testSlack(@RequestBody(required = false) TestSlackRequest request) {
        return alertService.testSlack(currentUser.id(), request);
    }

    @PostMapping("/alerts/test-email")
    public AlertTestResultDto testEmail(@Valid @RequestBody(required = false) TestEmailRequest request) {
        return alertService.testEmail(currentUser.id(), request);
    }
}
