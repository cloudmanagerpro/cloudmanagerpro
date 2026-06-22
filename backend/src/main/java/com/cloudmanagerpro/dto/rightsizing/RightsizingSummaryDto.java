package com.cloudmanagerpro.dto.rightsizing;

import java.math.BigDecimal;
import java.util.List;

public record RightsizingSummaryDto(
        long count,
        BigDecimal totalMonthlySavings,
        List<RightsizingDto> recommendations
) {
}
