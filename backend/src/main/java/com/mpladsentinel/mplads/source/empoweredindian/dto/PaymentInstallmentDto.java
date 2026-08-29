package com.mpladsentinel.mplads.source.empoweredindian.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.mpladsentinel.mplads.source.empoweredindian.support.FlexibleLocalDateDeserializer;

/**
 * One element of {@code data.allPayments[]} from
 * {@code GET /api/works/{workId}/payments} (docs/data-source.md &sect;13.4).
 *
 * <p>{@code status} is kept as the raw source string. The only value observed is
 * {@code "Payment Success"}; a "pending" string is presumed to exist (there is a
 * {@code pendingPayments} counter) but was never seen (&sect;13.10). Mapping it to
 * a normalised enum is a later-phase concern.
 *
 * <p>{@code ida} is the implementing-authority free-text string; there is no
 * structured implementing-agency field anywhere in the source.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PaymentInstallmentDto(
        @JsonProperty("amount") BigDecimal amount,
        @JsonProperty("date")
        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate date,
        @JsonProperty("status") String status,
        @JsonProperty("vendor") String vendor,
        @JsonProperty("ida") String ida
) {
}
