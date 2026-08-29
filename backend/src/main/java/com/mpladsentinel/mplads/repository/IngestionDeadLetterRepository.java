package com.mpladsentinel.mplads.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mpladsentinel.mplads.domain.IngestionDeadLetter;

/** Data access for {@link IngestionDeadLetter}. */
public interface IngestionDeadLetterRepository extends JpaRepository<IngestionDeadLetter, Long> {
}
