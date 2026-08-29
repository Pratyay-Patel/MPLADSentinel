package com.mpladsentinel.mplads.source.empoweredindian;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Configuration for {@link EmpoweredIndianClient}, bound from the
 * {@code mplads.empowered-indian.*} namespace (see {@code application.yml}, which
 * sources every value from an environment variable with a safe local default).
 *
 * <p>The Empowered Indian API requires no authentication, so there is no secret
 * here. {@code base-url} is a public, verified URL (docs/data-source.md &sect;13)
 * and is environment-overridable.
 *
 * @param baseUrl           API base, e.g. {@code https://api.empoweredindian.in/api}
 * @param connectTimeout    TCP connect timeout
 * @param readTimeout       response (read) timeout
 * @param maxAttempts       total attempts per call (1 = no retry). Retries apply
 *                          only to transport failures, HTTP 429 and HTTP 5xx.
 * @param retryDelay        fixed delay between attempts
 * @param defaultPageSize   default {@code limit} for callers that do not specify one (1..100)
 * @param maxErrorBodyChars upper bound on how much of a non-2xx / unexpected body
 *                          is copied into an exception message
 */
@ConfigurationProperties(prefix = "mplads.empowered-indian")
@Validated
public record EmpoweredIndianClientProperties(

        @DefaultValue("https://api.empoweredindian.in/api")
        @NotBlank
        String baseUrl,

        @DefaultValue("5s")
        @NotNull
        Duration connectTimeout,

        @DefaultValue("15s")
        @NotNull
        Duration readTimeout,

        @DefaultValue("3")
        @Min(1) @Max(10)
        int maxAttempts,

        @DefaultValue("500ms")
        @NotNull
        Duration retryDelay,

        @DefaultValue("20")
        @Min(1) @Max(100)
        int defaultPageSize,

        @DefaultValue("2000")
        @Min(256) @Max(20_000)
        int maxErrorBodyChars
) {

    public EmpoweredIndianClientProperties {
        baseUrl = baseUrl == null ? null : baseUrl.strip();
    }
}
