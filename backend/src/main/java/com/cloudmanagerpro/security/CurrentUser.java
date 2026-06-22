package com.cloudmanagerpro.security;

import com.cloudmanagerpro.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Convenience accessor for the authenticated tenant. Services call {@link #id()} and feed the
 * returned UUID into tenant-scoped repository queries, guaranteeing no cross-tenant access.
 */
@Component
public class CurrentUser {

    public UUID id() {
        return principal().getId();
    }

    public String email() {
        return principal().getUsername();
    }

    public SecurityUser principal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof SecurityUser securityUser)) {
            throw new UnauthorizedException("Authentication required");
        }
        return securityUser;
    }
}
