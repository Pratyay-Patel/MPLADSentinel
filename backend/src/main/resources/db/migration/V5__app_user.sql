-- V5 -- Application login accounts for the web portal.
--
-- Round 1 authentication is deliberately minimal (decision D31): a small set of
-- seeded demo accounts, one per web role, so that backend RBAC enforcement (D5)
-- is real for the demo. There is no self-registration, email verification,
-- password reset or MFA in Round 1.
--
-- This table holds ONLY portal login identities. It is unrelated to MPLADS
-- "MP" records ingested from the data source -- an 'MP' role account here is a
-- demo login, not a real Member of Parliament.
--
-- No rows are seeded in this migration: password hashes must never live in
-- source control. Accounts are created at application startup by
-- AuthUserSeeder (dev / demo) from a configurable seed password.

CREATE TABLE app_user (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username       VARCHAR(64)   NOT NULL,
    password_hash  VARCHAR(100)  NOT NULL,          -- BCrypt hash ($2a$… , 60 chars); column has headroom
    role           VARCHAR(16)   NOT NULL,
    display_name   VARCHAR(128),
    enabled        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_app_user_username UNIQUE (username),
    CONSTRAINT ck_app_user_role
        CHECK (role IN ('MOSPI', 'STATE', 'DISTRICT', 'AUDITOR', 'MP', 'CITIZEN'))
);

COMMENT ON TABLE  app_user IS 'Web-portal login accounts. Round 1: seeded demo accounts only (D31). Not related to ingested MPLADS MP records.';
COMMENT ON COLUMN app_user.role IS 'Web role, one of the six values in ck_app_user_role. Mirrors the frontend canAccess roles; Spring Security grants authority ROLE_<role>.';
COMMENT ON COLUMN app_user.password_hash IS 'BCrypt hash only. Never a plaintext or reversible value.';
