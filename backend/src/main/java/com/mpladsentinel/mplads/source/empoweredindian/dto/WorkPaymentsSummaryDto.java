package com.mpladsentinel.mplads.source.empoweredindian.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.mpladsentinel.mplads.source.empoweredindian.support.FlexibleLocalDateDeserializer;

/**
 * The {@code data.summary} object on the payments response
 * (docs/data-source.md &sect;13.4). Present only when payment rows exist; a work
 * with no payment rows produces an HTTP 404 with no {@code data} at all (see
 * {@link com.mpladsentinel.mplads.source.empoweredindian.EmpoweredIndianClient#fetchWorkPayments(long)}).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkPaymentsSummaryDto(
        @JsonProperty("totalInstallments") Integer totalInstallments,
        @JsonProperty("totalAmountPaid") BigDecimal totalAmountPaid,
        @JsonProperty("successfulPayments") Integer successfulPayments,
        @JsonProperty("pendingPayments") Integer pendingPayments,
        @JsonProperty("firstPaymentDate")
        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate firstPaymentDate,
        @JsonProperty("lastPaymentDate")
        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate lastPaymentDate
) {
}
