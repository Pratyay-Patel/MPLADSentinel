package com.mpladsentinel.mplads.web;

import java.time.LocalDate;

import com.mpladsentinel.mplads.domain.House;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.Work;

/**
 * The publicly releasable view of a {@link Work}, for the {@code /api/public/works}
 * endpoints used by the Citizen Portal. Mirrors the frontend {@code PublicProject}
 * type.
 *
 * <p>It carries <strong>only</strong> fields safe to show to the public: no risk
 * information, no {@code dataQualityFlags}, no ingestion provenance. It does
 * carry the recorded-payment summary ({@code paymentDataState},
 * {@code recordedPayments}, {@code paymentInstallments}) — plain public
 * expenditure data, not a risk signal; the individual installment rows are a
 * separate call, {@code GET /api/public/works/{reference}/payments}. A caller
 * of this endpoint never receives what this record does not contain
 * (CLAUDE.md §5, §14).
 *
 * <p>{@code reference} is the secondary source's numeric id — used only to
 * address the public detail route. It must never be presented as an official
 * MPLADS / e-SAKSHI work id.
 */
public record PublicWorkResponse(
        long reference,
        String workDescription,
        String category,
        String state,
        String district,
        String location,
        House house,
        Integer lsTerm,
        String memberOfParliament,
        String constituency,
        MoneyView estimatedCost,
        MoneyView finalCost,
        LifecycleState status,
        String sourceStatus,
        Integer expectedBeneficiaries,
        LocalDate recommendedOn,
        Integer recommendedYear,
        LocalDate completedOn,
        Integer completionYear,
        PaymentDataState paymentDataState,
        MoneyView recordedPayments,
        Integer paymentInstallments
) {

    public static PublicWorkResponse from(Work work) {
        MoneyView recorded = work.getPaymentDataState() == PaymentDataState.FETCHED_PRESENT
                ? MoneyView.of(work.getPaymentTotalPaid(), work.getCurrency())
                : null;

        return new PublicWorkResponse(
                work.getSourceWorkId(),
                work.getWorkDescription(),
                work.getCategory(),
                work.getState(),
                work.getDistrict(),
                work.getLocationRaw(),
                work.getHouse(),
                DtoSupport.box(work.getLsTerm()),
                work.getMpName(),
                work.getConstituency(),
                MoneyView.of(work.getEstimatedCost(), work.getCurrency()),
                MoneyView.of(work.getFinalCost(), work.getCurrency()),
                work.getLifecycleState(),
                work.getSourceStatusRaw(),
                work.getExpectedBeneficiaries(),
                work.getRecommendedOn(),
                DtoSupport.box(work.getRecommendedYear()),
                work.getCompletedOn(),
                DtoSupport.box(work.getCompletionYear()),
                work.getPaymentDataState(),
                recorded,
                work.getPaymentInstallments());
    }
}
