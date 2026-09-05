package com.mpladsentinel.auth;

import org.springframework.security.core.Authentication;

/**
 * The authenticated user's identity as returned by {@code POST /api/auth/login}
 * and {@code GET /api/auth/me}. {@link #role} is the bare {@link WebRole} name
 * (e.g. {@code "MOSPI"}), matching the frontend {@code Role} union.
 */
public record SessionUser(String username, String role, String displayName) {

    static SessionUser from(Authentication authentication) {
        AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
        return new SessionUser(
                principal.getUsername(), principal.role().name(), principal.displayName());
    }
}
