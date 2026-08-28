package com.mpladsentinel.mplads.repository;

import java.util.Optional;

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
}
