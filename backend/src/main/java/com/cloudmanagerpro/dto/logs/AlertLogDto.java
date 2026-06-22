package com.cloudmanagerpro.dto.logs;

import com.cloudmanagerpro.model.AlertLog;
import com.cloudmanagerpro.model.enums.AlertChannel;
import com.cloudmanagerpro.model.enums.AlertType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AlertLogDto(
        UUID id,
        AlertType alertType,
        AlertChannel channel,
        String subject,
        String message,
        boolean success,
        String errorMessage,
        OffsetDateTime sentAt,
        OffsetDateTime createdAt
) {
    public static AlertLogDto from(AlertLog log) {
        return new AlertLogDto(
                log.getId(),
                log.getAlertType(),
                log.getChannel(),
                log.getSubject(),
                log.getMessage(),
                log.isSuccess(),
                log.getErrorMessage(),
                log.getSentAt(),
                log.getCreatedAt());
    }
}
