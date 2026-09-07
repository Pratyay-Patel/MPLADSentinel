package com.mpladsentinel.auth;

/**
 * The web-portal roles a login account can hold.
 *
 * <p>The first six mirror the frontend {@code canAccess} roles (see
 * {@code frontend/src/auth/roles.ts}) and the RBAC roles in
 * {@code docs/requirements.md} / decision D5. {@code FIELD_OFFICER} (D34) has no
 * authority-facing web screens — it exists so the Flutter field app and the
 * portal share one account table; a field-officer row also carries
 * {@code officer_code} / {@code phone} (migration V8).
 *
 * <p>Names match the {@code ck_app_user_role} check constraint (migrations V5 /
 * V8). Spring Security authority for a role is {@code "ROLE_" + name()}.
 */
public enum WebRole {
    MOSPI,
    STATE,
    DISTRICT,
    AUDITOR,
    MP,
    CITIZEN,
    FIELD_OFFICER;

    /** Spring Security authority string for this role, e.g. {@code ROLE_MOSPI}. */
    public String authority() {
        return "ROLE_" + name();
    }
}
