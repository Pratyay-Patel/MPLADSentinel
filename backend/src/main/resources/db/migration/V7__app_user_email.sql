-- V7 -- Email on app_user, for citizen self-registration (decision D32, step B4a).
--
-- Seeded government accounts (V5 / AuthUserSeeder) keep their short usernames and
-- have no email. A self-registered citizen has username = email (the sign-up
-- form has no separate username field); this column stores that email explicitly
-- and enforces uniqueness case-insensitively at the application layer.
--
-- Round 1: no email verification / password reset / rate-limiting on the public
-- registration endpoint -- documented limitations (D32).

-- username now also holds an email for citizens, so widen it to the email max.
ALTER TABLE app_user ALTER COLUMN username TYPE VARCHAR(256);

ALTER TABLE app_user ADD COLUMN email VARCHAR(256);

ALTER TABLE app_user ADD CONSTRAINT uq_app_user_email UNIQUE (email);

COMMENT ON COLUMN app_user.email IS 'Login email for self-registered citizens (username = email). NULL for seeded government accounts.';
