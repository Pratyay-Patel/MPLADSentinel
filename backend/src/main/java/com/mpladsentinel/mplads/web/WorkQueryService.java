package com.mpladsentinel.mplads.web;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.common.web.PageResponse;
import com.mpladsentinel.common.web.PaginationRequest;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.normalization.DataQualityFlags;
import com.mpladsentinel.mplads.repository.WorkPaymentRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;

/**
 * Read model behind the {@code /api/works} and {@code /api/public/works}
 * endpoints. Pure queries + mapping to response records; no writes. Controllers
 * stay thin and hold no business logic.
 */
@Service
@Transactional(readOnly = true)
public class WorkQueryService {

    private static final String CURRENCY_INR = "INR";

    /**
     * List order: works with a usable description first, then by source work id.
     * Keeps rows whose description is missing / unreadable in the source
     * (e.g. {@code "?? ?? ??"}) out of the top of every list.
     */
    private static final Comparator<Work> LISTING_ORDER =
            Comparator.comparing(WorkQueryService::hasUnusableDescription)
                    .thenComparing(Work::getSourceWorkId);

    private final WorkRepository works;
    private final WorkPaymentRepository payments;

    public WorkQueryService(WorkRepository works, WorkPaymentRepository payments) {
        this.works = works;
        this.payments = payments;
    }

    // --- authority-facing (full) view -----------------------------------

    public PageResponse<WorkResponse> listWorks(PaginationRequest pagination) {
        List<WorkResponse> rows = works.findAll().stream()
                .sorted(LISTING_ORDER)
                .map(WorkResponse::from)
                .toList();
        return PageResponse.of(rows, pagination.page(), pagination.size());
    }

    public Optional<WorkResponse> getWork(long sourceWorkId) {
        return works.findFirstBySourceWorkIdOrderByIdAsc(sourceWorkId).map(WorkResponse::from);
    }

    /**
     * Payment installments for a work, ordered by source position. Empty
     * {@link Optional} means the work itself is unknown; a present-but-empty
     * list means the work exists with no payment rows (which is <em>not</em>
     * "&#8377;0 spent" — see {@link PaymentDataState}).
     */
        public Optional<PageResponse<WorkPaymentResponse>> getPayments(
            long sourceWorkId, PaginationRequest pagination) {
        return works.findFirstBySourceWorkIdOrderByIdAsc(sourceWorkId).map(work -> {
            List<WorkPaymentResponse> rows = new ArrayList<>();
            var installments = payments.findByWorkIdOrderBySourceOrdinalAsc(work.getId());
            for (int i = 0; i < installments.size(); i++) {
                rows.add(WorkPaymentResponse.from(installments.get(i), i));
            }
            return PageResponse.of(rows, pagination.page(), pagination.size());
        });
    }

    public WorkSummaryResponse summary() {
        return new WorkSummaryResponse(
                works.count(),
                tally(LifecycleState.class, works.countByLifecycleState()),
                tally(PaymentDataState.class, works.countByPaymentDataState()),
                money(works.sumEstimatedCost()),
                money(works.sumRecordedPayments()));
    }

    // --- publicly releasable view --------------------------------------

    public PageResponse<PublicWorkResponse> listPublicWorks(PaginationRequest pagination) {
        List<PublicWorkResponse> rows = works.findAll().stream()
                .sorted(LISTING_ORDER)
                .map(PublicWorkResponse::from)
                .toList();
        return PageResponse.of(rows, pagination.page(), pagination.size());
    }

    public Optional<PublicWorkResponse> getPublicWork(long sourceWorkId) {
        return works.findFirstBySourceWorkIdOrderByIdAsc(sourceWorkId).map(PublicWorkResponse::from);
    }

    // --- helpers ------------------------------------------------------

    private static boolean hasUnusableDescription(Work work) {
        for (String flag : work.getDataQualityFlags()) {
            if (DataQualityFlags.MISSING_WORK_DESCRIPTION.equals(flag)
                    || DataQualityFlags.UNREADABLE_WORK_DESCRIPTION.equals(flag)) {
                return true;
            }
        }
        return false;
    }

    private static <E extends Enum<E>> Map<String, Long> tally(Class<E> type, List<Object[]> rows) {
        Map<String, Long> out = new LinkedHashMap<>();
        for (E value : type.getEnumConstants()) {
            out.put(value.name(), 0L);
        }
        for (Object[] row : rows) {
            out.put(((Enum<?>) row[0]).name(), (Long) row[1]);
        }
        return out;
    }

    private static MoneyView money(BigDecimal amount) {
        return new MoneyView(amount == null ? BigDecimal.ZERO : amount, CURRENCY_INR);
    }
}
