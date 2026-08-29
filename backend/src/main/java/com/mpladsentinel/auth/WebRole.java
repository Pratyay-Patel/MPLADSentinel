package com.mpladsentinel.auth;

/**
 * The six web-portal roles a login account can hold.
 *
 * <p>This list mirrors the frontend {@code canAccess} roles (see
 * {@code frontend/src/auth/roles.ts}) and the RBAC roles in
 * {@code docs/requirements.md} / decision D5, minus {@code Field Officer} which
 * has no web interface in Round 1 (D23 — it is served by the Flutter app).
 *
 * <p>Names match the {@code ck_app_user_role} check constraint (migration V5).
 * Spring Security authority for a role is {@code "ROLE_" + name()}.
 */
public enum WebRole {
    MOSPI,
    STATE,
    DISTRICT,
    AUDITOR,
    MP,
    CITIZEN;

    /** Spring Security authority string for this role, e.g. {@code ROLE_MOSPI}. */
    public String authority() {
        return "ROLE_" + name();
    }
}
