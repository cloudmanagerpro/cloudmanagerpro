package com.cloudmanagerpro.dto.cost;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CostPointDto(
        LocalDate date,
        BigDecimal amount
) {
}
