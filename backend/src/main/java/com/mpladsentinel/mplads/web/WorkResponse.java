package com.mpladsentinel.mplads.web;

import java.time.LocalDate;
import java.util.List;

import com.mpladsentinel.mplads.domain.House;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.Work;

/**
 * The full internal view of a {@link Work}, for the authority-facing
 * {@code /api/works} endpoints. Mirrors the frontend {@code Project} type
 * field-for-field.
 *
 * <p>Deliberately omitted: normalized-name columns, ingestion provenance
 * timestamps, the inline {@code rec*} payment signal, and row-audit timestamps
 * — none are part of the frontend model. The publicly releasable subset is
 * {@link PublicWorkResponse}.
 */
public record WorkResponse(
        String sourceName,
        long sourceWorkId,
        String workDescription,
        String category,
        House house,
        Integer lsTerm,
        String mpName,
        String constituency,
        String state,
        String district,
        String locationRaw,
        MoneyView estimatedCost,
        MoneyView finalCost,
        LocalDate recommendedOn,
        Integer recommendedYear,
        LocalDate completedOn,
        Integer completionYear,
        String sourceStatusRaw,
        Integer expectedBeneficiaries,
        boolean seenInRecommended,
        boolean seenInCompleted,
        LifecycleState lifecycleState,
        PaymentDataState paymentDataState,
        MoneyView recordedPayments,
        Integer paymentInstallments,
        List<String> dataQualityFlags
) {

    public static WorkResponse from(Work work) {
        MoneyView recorded = work.getPaymentDataState() == PaymentDataState.FETCHED_PRESENT
                ? MoneyView.of(work.getPaymentTotalPaid(), work.getCurrency())
                : null;

        return new WorkResponse(
                work.getSourceName(),
                work.getSourceWorkId(),
                work.getWorkDescription(),
                work.getCategory(),
                work.getHouse(),
                DtoSupport.box(work.getLsTerm()),
                work.getMpName(),
                work.getConstituency(),
                work.getState(),
                work.getDistrict(),
                work.getLocationRaw(),
                MoneyView.of(work.getEstimatedCost(), work.getCurrency()),
                MoneyView.of(work.getFinalCost(), work.getCurrency()),
                work.getRecommendedOn(),
                DtoSupport.box(work.getRecommendedYear()),
                work.getCompletedOn(),
                DtoSupport.box(work.getCompletionYear()),
                work.getSourceStatusRaw(),
                work.getExpectedBeneficiaries(),
                work.isSeenInRecommended(),
                work.isSeenInCompleted(),
                work.getLifecycleState(),
                work.getPaymentDataState(),
                recorded,
                work.getPaymentInstallments(),
                List.of(work.getDataQualityFlags()));
    }
}
