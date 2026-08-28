package com.mpladsentinel.mplads.source.empoweredindian.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.mpladsentinel.mplads.source.empoweredindian.support.FlexibleLocalDateDeserializer;

/**
 * One element of {@code data.recommendedWorks[]} from
 * {@code GET /api/works/recommended} (docs/data-source.md &sect;13.2).
 *
 * <p>Field names here follow the recommended endpoint exactly. They
 * <strong>differ</strong> from the completed endpoint &mdash; see
 * {@link CompletedWorkDto} ({@code workId} vs {@code work_id},
 * {@code estimated_cost} vs {@code cost}, {@code expected_beneficiaries} vs
 * {@code beneficiaries}). Never conflate the two.
 *
 * <p>{@code workId} is the <strong>Empowered Indian source identifier</strong>.
 * Its relationship to any official MPLADS / e-SAKSHI id is unknown
 * (&sect;13.6, &sect;14.3); it must not be presented as an official id.
 *
 * <p>{@code *Hi} fields, {@code expectedBeneficiaries} and the inline
 * {@code hasPayments}/{@code totalPaid}/{@code paymentCount} are captured as the
 * source provides them; &sect;13.8 documents their known quality issues.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RecommendedWorkDto(

        @JsonProperty("_id") String sourceObjectId,
        @JsonProperty("workId") Long workId,

        @JsonProperty("house") String house,
        @JsonProperty("lsTerm") Integer lsTerm,

        @JsonProperty("work_description") String workDescription,
        @JsonProperty("work_description_hi") String workDescriptionHi,
        @JsonProperty("category") String category,
        @JsonProperty("category_hi") String categoryHi,

        @JsonProperty("estimated_cost") BigDecimal estimatedCost,

        @JsonProperty("recommended_date")
        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate recommendedDate,
        @JsonProperty("recommended_year") Integer recommendedYear,

        @JsonProperty("status") String status,
        @JsonProperty("status_hi") String statusHi,

        @JsonProperty("location") String location,
        @JsonProperty("location_hi") String locationHi,
        @JsonProperty("district") String district,
        @JsonProperty("district_hi") String districtHi,
        @JsonProperty("state") String state,
        @JsonProperty("state_hi") String stateHi,

        @JsonProperty("expected_beneficiaries") Integer expectedBeneficiaries,

        @JsonProperty("mp_details") MpDetailsDto mpDetails,

        @JsonProperty("hasPayments") Boolean hasPayments,
        @JsonProperty("totalPaid") BigDecimal totalPaid,
        @JsonProperty("paymentCount") Integer paymentCount
) {
}
