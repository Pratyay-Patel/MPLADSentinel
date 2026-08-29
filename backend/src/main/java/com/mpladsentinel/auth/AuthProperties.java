package com.mpladsentinel.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * Configuration for Round 1 authentication, bound from {@code mplads.auth.*}
 * (see {@code application.yml}).
 *
 * @param seedingEnabled when {@code true}, {@link AuthUserSeeder} creates the
 *                       demo accounts at startup if they are absent. Set to
 *                       {@code false} in any environment that provisions its own
 *                       accounts (and in tests that manage their own fixtures).
 * @param seedPassword   shared password given to every seeded demo account. This
 *                       is a local-development convenience only — the same class
 *                       of value as {@code MPLADS_DB_PASSWORD}. Override per
 *                       environment via {@code MPLADS_AUTH_SEED_PASSWORD}; it is
 *                       BCrypt-hashed before storage and never persisted in
 *                       plaintext.
 */
@ConfigurationProperties(prefix = "mplads.auth")
@Validated
public record AuthProperties(

        @DefaultValue("true") boolean seedingEnabled,

        @DefaultValue("Demo@12345") @NotBlank String seedPassword
) {
}
