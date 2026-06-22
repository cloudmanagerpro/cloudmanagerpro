package com.cloudmanagerpro.dto.alerts;

public record AlertTestResultDto(
        boolean success,
        String channel,
        String message
) {
}
