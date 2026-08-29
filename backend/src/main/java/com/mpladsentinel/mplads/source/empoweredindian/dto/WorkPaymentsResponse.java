package com.mpladsentinel.mplads.source.empoweredindian.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The {@code data} object of a successful
 * {@code GET /api/works/{workId}/payments} response (docs/data-source.md &sect;13.4).
 *
 * <p>Obtaining this object means <em>payment rows exist</em> for the work. The
 * client returns it wrapped in an {@link java.util.Optional}; an empty Optional
 * means the API answered HTTP 404 "No payment records found for this work",
 * which is <strong>not</strong> zero expenditure &mdash; see
 * {@link com.mpladsentinel.mplads.source.empoweredindian.EmpoweredIndianClient#fetchWorkPayments(long)}.
 *
 * <p>{@code data.paymentTimeline} is intentionally not mapped: it is a grouped
 * re-presentation of {@code allPayments}, which is the authoritative
 * per-installment list.
 *
 * @param workId       the numeric work id echoed by the endpoint
 * @param workDetails  scheme/MP context (note {@code description} is a generic
 *                     scheme string, not the work description)
 * @param summary      installment totals and first/last payment dates
 * @param allPayments  every payment installment; never {@code null}
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkPaymentsResponse(
        @JsonProperty("workId") Long workId,
        @JsonProperty("workDetails") WorkPaymentDetailsDto workDetails,
        @JsonProperty("summary") WorkPaymentsSummaryDto summary,
        @JsonProperty("allPayments") List<PaymentInstallmentDto> allPayments
) {

    public WorkPaymentsResponse {
        allPayments = allPayments == null ? List.of() : List.copyOf(allPayments);
    }
}
