package com.cloudmanagerpro.dto.auth;

public record AuthResponse(
        String token,
        UserDto user
) {
}
