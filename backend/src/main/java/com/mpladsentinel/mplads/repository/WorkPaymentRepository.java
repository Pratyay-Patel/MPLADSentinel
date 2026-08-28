package com.mpladsentinel.mplads.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mpladsentinel.mplads.domain.WorkPayment;

/**
 * Data access for {@link WorkPayment}. Payment-to-work lookup is by the owning
 * work's id.
 */
public interface WorkPaymentRepository extends JpaRepository<WorkPayment, Long> {

    List<WorkPayment> findByWorkIdOrderBySourceOrdinalAsc(Long workId);

    long countByWorkId(Long workId);

    /** Idempotency check for a single installment. */
    Optional<WorkPayment> findByWorkIdAndSourceFingerprint(Long workId, String sourceFingerprint);
}
