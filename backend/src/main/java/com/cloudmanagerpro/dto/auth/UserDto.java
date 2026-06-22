package com.cloudmanagerpro.dto.auth;

import com.cloudmanagerpro.model.User;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserDto(
        UUID id,
        String email,
        String name,
        String role,
        OffsetDateTime createdAt
) {
    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                user.getCreatedAt());
    }
}
