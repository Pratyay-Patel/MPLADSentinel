package com.mpladsentinel.mplads.source.empoweredindian.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.mpladsentinel.mplads.source.empoweredindian.support.FlexibleLocalDateDeserializer;

/**
 * One element of {@code data.completedWorks[]} from
 * {@code GET /api/works/completed} (docs/data-source.md &sect;13.3).
 *
 * <p><strong>Field names differ from the recommended endpoint</strong>
 * ({@link RecommendedWorkDto}):
 * <ul>
 *   <li>{@code work_id} here, not {@code workId};</li>
 *   <li>{@code cost} here (the final/actual cost), not {@code estimated_cost};</li>
 *   <li>{@code beneficiaries} here, not {@code expected_beneficiaries}.</li>
 * </ul>
 * Completed records also <strong>omit</strong> {@code house}, {@code lsTerm},
 * {@code status}, and the inline payment fields.
 *
 * <p>{@code workId} below is populated from the source's {@code work_id} and is
 * the same integer id space as the recommended {@code workId} and the payments
 * path parameter (&sect;13.6). It is an Empowered Indian source id, not an
 * official identifier.
 *
 * <p>{@code cost} is {@link BigDecimal}: values observed are integers but
 * {@code summary.totalCost} is a 2-dp float, so non-integer costs are possible
 * (&sect;13.8).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CompletedWorkDto(

        @JsonProperty("_id") String sourceObjectId,
        @JsonProperty("work_id") Long workId,

        @JsonProperty("work_description") String workDescription,
        @JsonProperty("work_description_hi") String workDescriptionHi,
        @JsonProperty("category") String category,
        @JsonProperty("category_hi") String categoryHi,

        @JsonProperty("cost") BigDecimal cost,

        @JsonProperty("completion_date")
        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate completionDate,
        @JsonProperty("completion_year") Integer completionYear,

        @JsonProperty("location") String location,
        @JsonProperty("location_hi") String locationHi,
        @JsonProperty("district") String district,
        @JsonProperty("district_hi") String districtHi,
        @JsonProperty("state") String state,
        @JsonProperty("state_hi") String stateHi,

        @JsonProperty("beneficiaries") Integer beneficiaries,

        @JsonProperty("mp_details") MpDetailsDto mpDetails
) {
}
