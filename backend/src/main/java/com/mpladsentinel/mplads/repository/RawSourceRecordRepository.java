package com.mpladsentinel.mplads.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.RawSourceRecord;

/** Data access for {@link RawSourceRecord}. */
public interface RawSourceRecordRepository extends JpaRepository<RawSourceRecord, Long> {

    Optional<RawSourceRecord> findBySourceNameAndEndpointAndSourceWorkId(
            String sourceName, IngestionEndpoint endpoint, Long sourceWorkId);
}
