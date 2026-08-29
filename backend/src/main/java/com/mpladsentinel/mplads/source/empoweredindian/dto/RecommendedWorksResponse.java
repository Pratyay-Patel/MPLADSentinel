package com.mpladsentinel.mplads.source.empoweredindian.dto;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The {@code data} object of a {@code GET /api/works/recommended} success
 * response (docs/data-source.md &sect;13.2). The outer {@code {"success":true,"data":{...}}}
 * envelope is unwrapped by the client.
 *
 * <p>{@code data.summary} and {@code data.filters} are intentionally not mapped:
 * the recommended {@code summary} is all-zero on unfiltered requests and
 * {@code filters} only echoes recognised query params (&sect;13.2).
 *
 * @param recommendedWorks the page of works; never {@code null} (empty list if absent)
 * @param pagination       page metadata
 * @param lastUpdated      the server's response time &mdash; <strong>not</strong> a
 *                         data-freshness timestamp (&sect;13.8)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RecommendedWorksResponse(
        @JsonProperty("recommendedWorks") List<RecommendedWorkDto> recommendedWorks,
        @JsonProperty("pagination") PageMetadata pagination,
        @JsonProperty("lastUpdated") Instant lastUpdated
) {

    public RecommendedWorksResponse {
        recommendedWorks = recommendedWorks == null ? List.of() : List.copyOf(recommendedWorks);
    }
}
