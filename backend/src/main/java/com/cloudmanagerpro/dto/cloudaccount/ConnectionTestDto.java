package com.cloudmanagerpro.dto.cloudaccount;

import com.cloudmanagerpro.model.enums.ConnectionStatus;

public record ConnectionTestDto(
        boolean success,
        String message,
        String accountIdentifier,
        ConnectionStatus status
) {
}
