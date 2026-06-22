package com.cloudmanagerpro.dto.cost;

import java.math.BigDecimal;
import java.util.List;

public record CostSummaryDto(
        BigDecimal currentMonthToDate,
        BigDecimal lastMonthTotal,
        BigDecimal last30Days,
        BigDecimal previous30Days,
        double changePercent,
        BigDecimal projectedMonthly,
        BigDecimal dailyAverage,
        BigDecimal totalPotentialSavings,
        String currency,
        List<KeyAmountDto> topServices,
        List<KeyAmountDto> byProvider
) {
}
