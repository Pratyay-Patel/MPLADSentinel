package com.mpladsentinel.mplads.repository;

import java.math.BigDecimal;
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
}
