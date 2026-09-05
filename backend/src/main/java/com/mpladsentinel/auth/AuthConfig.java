package com.mpladsentinel.auth;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Enables {@link AuthProperties}. The auth collaborators
 * ({@link AppUserDetailsService}, {@link AuthUserSeeder}, {@link AuthController})
 * are ordinary component-scanned beans; the security infrastructure beans
 * (password encoder, filter chain, authentication manager) live in
 * {@code com.mpladsentinel.config.SecurityConfig}.
 */
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
class AuthConfig {
}
