package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.resource.ResourceDto;
import com.cloudmanagerpro.dto.resource.ResourceFilter;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.WasteState;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.ResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<ResourceDto> list(
            @RequestParam(required = false) Provider provider,
            @RequestParam(required = false) ResourceType resourceType,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) WasteState wasteState,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) BigDecimal minCost,
            @RequestParam(required = false) BigDecimal maxCost) {
        ResourceFilter filter = new ResourceFilter(provider, resourceType, region, status, wasteState, search, tag,
                minCost, maxCost);
        return resourceService.search(currentUser.id(), filter);
    }

    @GetMapping("/{id}")
    public ResourceDto get(@PathVariable UUID id) {
        return resourceService.get(currentUser.id(), id);
    }
}
