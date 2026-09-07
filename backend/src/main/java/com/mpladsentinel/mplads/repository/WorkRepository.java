package com.mpladsentinel.mplads.repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import com.mpladsentinel.mplads.domain.Work;

/**
 * Data access for {@link Work}. Business logic (ingestion upserts, dashboard
 * queries, risk scoring) belongs in later phases, not here.
 */
public interface WorkRepository extends JpaRepository<Work, Long> {

    /** Natural-key lookup used for idempotent ingestion. */
    Optional<Work> findBySourceNameAndSourceWorkId(String sourceName, Long sourceWorkId);

    boolean existsBySourceNameAndSourceWorkId(String sourceName, Long sourceWorkId);

    /**
     * Lookup by the source work id alone. There is a single data source today
     * ({@code EMPOWERED_INDIAN}), so this is effectively unique; {@code first} +
     * ordering keeps it deterministic if that ever stops holding.
     */
    Optional<Work> findFirstBySourceWorkIdOrderByIdAsc(Long sourceWorkId);

    /** Batch lookup by source work id — used to attach work titles to a list of records. */
    List<Work> findBySourceWorkIdIn(Collection<Long> sourceWorkIds);

    // --- read-model aggregates (works summary API) ------------------------

    @Query("select w.lifecycleState, count(w) from Work w group by w.lifecycleState")
    List<Object[]> countByLifecycleState();

    @Query("select w.paymentDataState, count(w) from Work w group by w.paymentDataState")
    List<Object[]> countByPaymentDataState();

    @Query("select coalesce(sum(w.estimatedCost), 0) from Work w")
    BigDecimal sumEstimatedCost();

    @Query("select coalesce(sum(w.paymentTotalPaid), 0) from Work w "
            + "where w.paymentDataState = com.mpladsentinel.mplads.domain.PaymentDataState.FETCHED_PRESENT")
    BigDecimal sumRecordedPayments();

    /**
     * Per-category cost cohorts for the risk engine's {@code COST_COHORT_OUTLIER}
     * rule: {@code [category, max(estimatedCost), count]} over works that have both.
     */
    @Query("select w.category, max(w.estimatedCost), count(w) from Work w "
            + "where w.category is not null and w.estimatedCost is not null group by w.category")
    List<Object[]> categoryCohorts();
}
