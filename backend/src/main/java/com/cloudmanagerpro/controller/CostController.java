package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.cost.CostPointDto;
import com.cloudmanagerpro.dto.cost.CostSummaryDto;
import com.cloudmanagerpro.dto.cost.KeyAmountDto;
import com.cloudmanagerpro.dto.cost.SavingsOpportunityDto;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.cost.CostService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/cost")
@RequiredArgsConstructor
public class CostController {

    private final CostService costService;
    private final CurrentUser currentUser;

    @GetMapping("/summary")
    public CostSummaryDto summary() {
        return costService.summary(currentUser.id());
    }

    @GetMapping("/trend")
    public List<CostPointDto> trend(@RequestParam(defaultValue = "30") int days) {
        return costService.trend(currentUser.id(), days);
    }

    @GetMapping("/by-provider")
    public List<KeyAmountDto> byProvider(@RequestParam(defaultValue = "30") int days) {
        return costService.byProvider(currentUser.id(), days);
    }

    @GetMapping("/by-service")
    public List<KeyAmountDto> byService(@RequestParam(defaultValue = "30") int days) {
        return costService.byService(currentUser.id(), days);
    }

    @GetMapping("/by-region")
    public List<KeyAmountDto> byRegion(@RequestParam(defaultValue = "30") int days) {
        return costService.byRegion(currentUser.id(), days);
    }

    @GetMapping("/savings-opportunities")
    public List<SavingsOpportunityDto> savingsOpportunities() {
        return costService.savingsOpportunities(currentUser.id());
    }
}
