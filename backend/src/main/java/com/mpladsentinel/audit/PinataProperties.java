package com.mpladsentinel.audit;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Configuration for the Pinata / IPFS evidence integration, bound from
 * {@code mplads.pinata.*} (see {@code application.yml}).
 *
 * <p><strong>{@code jwt} is a secret.</strong> It lives only as the backend
 * environment variable {@code PINATA_JWT} — never in the frontend, Vercel, git,
 * or source. When it is blank (the default) the integration is considered
 * <em>not configured</em>: the audit-photos endpoint returns an empty list with
 * {@code configured: false} and never calls Pinata.
 *
 * <p>This is a read-only demo integration: the backend fetches the most recent
 * {@link #evidenceLimit} files uploaded to the account. It does not upload,
 * pin, or delete anything.
 */
@ConfigurationProperties(prefix = "mplads.pinata")
@Validated
public record PinataProperties(

        @DefaultValue("") String jwt,

        @DefaultValue("https://api.pinata.cloud") @NotBlank String apiBaseUrl,

        /** Pinata "network" path segment for the Files API — {@code public} or {@code private}. */
        @DefaultValue("public") @NotBlank String network,

        @DefaultValue("https://gateway.pinata.cloud/ipfs/") @NotBlank String gatewayBaseUrl,

        @DefaultValue("5s") @NotNull Duration connectTimeout,

        @DefaultValue("10s") @NotNull Duration readTimeout,

        /** How many of the most recent uploads to surface as field evidence. */
        @DefaultValue("2") @Min(1) @Max(20) int evidenceLimit
) {

    public PinataProperties {
        jwt = jwt == null ? "" : jwt.strip();
        apiBaseUrl = apiBaseUrl == null ? null : apiBaseUrl.strip();
        gatewayBaseUrl = gatewayBaseUrl == null ? null : gatewayBaseUrl.strip();
    }

    /** {@code true} once a {@code PINATA_JWT} has been supplied. */
    public boolean configured() {
        return !jwt.isBlank();
    }

    /** Public gateway URL for a CID, with exactly one slash between the base and the CID. */
    public String gatewayUrlFor(String cid) {
        String base = gatewayBaseUrl.endsWith("/") ? gatewayBaseUrl : gatewayBaseUrl + "/";
        return base + cid;
    }
}
