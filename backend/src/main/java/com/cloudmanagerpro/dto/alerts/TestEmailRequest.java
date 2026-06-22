package com.cloudmanagerpro.dto.alerts;

import jakarta.validation.constraints.Email;

/** Optional recipient override for a one-off email test; falls back to saved recipients when null. */
public record TestEmailRequest(
        @Email String recipient
) {
}
