package com.mpladsentinel.mplads.source.empoweredindian.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The embedded {@code mp_details} object on recommended and completed work
 * records (docs/data-source.md &sect;13.2, &sect;13.3).
 *
 * <p>There is no MP identifier &mdash; only free text, UPPERCASE. {@code nameHi}
 * mirrors {@code name} in all observed data. {@code party} is
 * <strong>mis-populated</strong> by the source: it holds the House name
 * (e.g. {@code "Lok Sabha"}), not a political party (&sect;13.8). Fields are
 * captured verbatim; interpretation is left to later phases.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MpDetailsDto(
        @JsonProperty("name") String name,
        @JsonProperty("name_hi") String nameHi,
        @JsonProperty("constituency") String constituency,
        @JsonProperty("party") String party
) {
}
