package com.cloudmanagerpro.dto.actions;

import com.cloudmanagerpro.model.enums.ActionType;

/**
 * Body for {@code POST /resources/{id}/actions/dry-run} and {@code .../execute}.
 * Example: {@code { "action": "RESIZE", "params": { "instanceType": "t3.medium" }, "confirmation": "my-vm" }}.
 */
public record ActionRequest(
        ActionType action,
        ActionParamsDto params,
        String confirmation
) {
}
