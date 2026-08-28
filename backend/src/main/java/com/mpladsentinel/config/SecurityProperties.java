package com.mpladsentinel.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Externally configurable security-related settings.
 *
 * <p>Bound from the {@code mplads.security.*} configuration namespace, which in
 * turn is populated from environment variables (see {@code application.yml}).
 */
@ConfigurationProperties(prefix = "mplads.security")
public record SecurityProperties(
        /**
         * Browser origins permitted to call the API via CORS. Typically the
         * frontend dev server during development.
         */
        List<String> corsAllowedOrigins
) {
    public SecurityProperties {
        corsAllowedOrigins = corsAllowedOrigins == null ? List.of() : List.copyOf(corsAllowedOrigins);
    }
}
