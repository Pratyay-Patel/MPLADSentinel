package com.mpladsentinel.mplads.source.empoweredindian.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The {@code data.workDetails} object on the payments response
 * (docs/data-source.md &sect;13.4).
 *
 * <p>{@code description} here is a <strong>generic scheme work-type string</strong>
 * (e.g. "Construction of roads, link roads, pathways ..."), <strong>not</strong>
 * the work's own {@code work_description}. They are different concepts and must
 * not be equated.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkPaymentDetailsDto(
        @JsonProperty("description") String description,
        @JsonProperty("mpName") String mpName,
        @JsonProperty("constituency") String constituency,
        @JsonProperty("ida") String ida
) {
}
