package com.mpladsentinel.mplads.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mpladsentinel.mplads.domain.IngestionRun;

/** Data access for {@link IngestionRun}. */
public interface IngestionRunRepository extends JpaRepository<IngestionRun, Long> {
}
