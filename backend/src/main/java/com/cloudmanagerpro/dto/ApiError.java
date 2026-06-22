package com.cloudmanagerpro.dto;

import java.time.OffsetDateTime;

/** Uniform error envelope returned for every failed request. */
public record ApiError(
        OffsetDateTime timestamp,
        int status,
        String error,
        String message
) {
    public static ApiError of(org.springframework.http.HttpStatus status, String message) {
        return new ApiError(OffsetDateTime.now(), status.value(), status.getReasonPhrase(), message);
    }
}
