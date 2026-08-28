package com.mpladsentinel.mplads.source.empoweredindian.dto;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The {@code data} object of a {@code GET /api/works/completed} success response
 * (docs/data-source.md &sect;13.3). Envelope unwrapped by the client.
 *
 * <p>Unlike the recommended endpoint, the completed {@code summary} carries real
 * aggregate values; it is still not mapped here because this phase only needs the
 * page of records and its pagination. {@code data.summary.uniqueDistricts} is
 * known to contain non-district values (&sect;13.3) and should not be trusted if
 * mapped later.
 *
 * @param completedWorks the page of works; never {@code null}
 * @param pagination      page metadata ({@code totalCount} stable here, ~43 667)
 * @param lastUpdated     server response time, not data freshness (&sect;13.8)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CompletedWorksResponse(
        @JsonProperty("completedWorks") List<CompletedWorkDto> completedWorks,
        @JsonProperty("pagination") PageMetadata pagination,
        @JsonProperty("lastUpdated") Instant lastUpdated
) {

    public CompletedWorksResponse {
        completedWorks = completedWorks == null ? List.of() : List.copyOf(completedWorks);
    }
}
