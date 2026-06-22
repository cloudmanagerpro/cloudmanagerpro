package com.cloudmanagerpro.dto.cost;

import java.math.BigDecimal;

public record KeyAmountDto(
        String key,
        BigDecimal amount
) {
}
