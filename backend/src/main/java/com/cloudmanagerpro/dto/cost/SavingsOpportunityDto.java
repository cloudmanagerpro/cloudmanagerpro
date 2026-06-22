package com.cloudmanagerpro.dto.cost;

import java.math.BigDecimal;

public record SavingsOpportunityDto(
        String category,
        long count,
        BigDecimal estimatedMonthlySavings
) {
}
