package com.mpladsentinel.mplads.ingestion;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.mpladsentinel.mplads.domain.Work;

/**
 * Read-only query for selecting which {@link Work} rows the payment ingestion run
 * should fetch next. A separate repository interface so the Phase 2C
 * {@code WorkRepository} is left untouched.
 *
 * <p>Candidate = payments never fetched, or a prior fetch error, or a
 * {@code FETCHED_ABSENT} / {@code FETCHED_PRESENT} result old enough to recheck
 * (Q6). Age is approximated by {@code last_ingested_at} &mdash; there is
 * deliberately no dedicated last-checked column.
 */
public interface PaymentCandidateQueries extends Repository<Work, Long> {

    @Query("""
            select w.id from Work w
            where w.sourceName = :source
              and (
                    w.paymentDataState = com.mpladsentinel.mplads.domain.PaymentDataState.NOT_FETCHED
                 or w.paymentDataState = com.mpladsentinel.mplads.domain.PaymentDataState.FETCH_ERROR
                 or (w.paymentDataState = com.mpladsentinel.mplads.domain.PaymentDataState.FETCHED_ABSENT
                     and w.lastIngestedAt < :absentBefore)
                 or (w.paymentDataState = com.mpladsentinel.mplads.domain.PaymentDataState.FETCHED_PRESENT
                     and w.lastIngestedAt < :presentBefore)
              )
            order by w.id
            """)
    List<Long> findCandidateWorkIds(@Param("source") String source,
                                    @Param("absentBefore") Instant absentBefore,
                                    @Param("presentBefore") Instant presentBefore,
                                    Pageable pageable);
}
