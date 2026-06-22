package com.cloudmanagerpro.dto.resource;

import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.WasteState;

import java.math.BigDecimal;

/** Optional filters for the resource explorer; all fields are nullable. */
public record ResourceFilter(
        Provider provider,
        ResourceType resourceType,
        String region,
        String status,
        WasteState wasteState,
        String search,
        String tag,
        BigDecimal minCost,
        BigDecimal maxCost
) {
}
