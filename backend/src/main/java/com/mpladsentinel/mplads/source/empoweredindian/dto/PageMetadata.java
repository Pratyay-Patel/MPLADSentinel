package com.mpladsentinel.mplads.source.empoweredindian.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The {@code data.pagination} object, identical in shape on the recommended and
 * completed endpoints (docs/data-source.md &sect;13.2, &sect;13.3).
 *
 * <p>{@code totalCount} is <strong>approximate</strong>: on {@code /works/recommended}
 * it differs between the first page and other request shapes (&sect;13.7). Treat it
 * as guidance for iteration, not an exact figure.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PageMetadata(
        @JsonProperty("currentPage") Integer currentPage,
        @JsonProperty("totalPages") Integer totalPages,
        @JsonProperty("totalCount") Long totalCount,
        @JsonProperty("hasNext") Boolean hasNext,
        @JsonProperty("hasPrev") Boolean hasPrev
) {
}
