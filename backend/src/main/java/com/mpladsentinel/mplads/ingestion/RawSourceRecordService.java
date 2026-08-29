package com.mpladsentinel.mplads.ingestion;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.RawSourceRecord;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.repository.RawSourceRecordRepository;

/**
 * Maintains {@code raw_source_record}: the latest verbatim payload per
 * {@code (source_name, endpoint, source_work_id)} (docs/data-source.md &sect;13.11).
 *
 * <p>Not a historical archive &mdash; each upsert overwrites the previous snapshot
 * for that key (CLAUDE.md &sect;8). Written <em>before</em> normalisation so a
 * normalisation failure still leaves the payload for later re-processing.
 *
 * <p>These methods carry no {@code @Transactional} of their own; they run inside
 * the caller's page / payment-snapshot transaction.
 */
@Service
public class RawSourceRecordService {

    private final RawSourceRecordRepository repository;
    private final ObjectMapper objectMapper;

    RawSourceRecordService(RawSourceRecordRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    /** Result of an upsert: whether a row already existed, and whether its payload changed. */
    public record RawUpsert(boolean existed, boolean changed) {
    }

    /**
     * Upsert the raw payload for one work record (recommended or completed).
     *
     * @param dto the source DTO, serialised verbatim as the stored JSON payload
     */
    public RawUpsert upsertWorkPayload(IngestionEndpoint endpoint, long sourceWorkId, Object dto,
                                       Instant retrievedAt, IngestionRun run) {
        return upsert(endpoint, sourceWorkId, toJson(dto), (short) 200, retrievedAt, run);
    }

    /** Upsert the raw payload for a successful payments response ({@code data} object). */
    public RawUpsert upsertPaymentsPayload(long sourceWorkId, Object paymentsData, Instant retrievedAt,
                                           IngestionRun run) {
        return upsert(IngestionEndpoint.WORK_PAYMENTS, sourceWorkId, toJson(paymentsData), (short) 200,
                retrievedAt, run);
    }

    /**
     * Upsert a sentinel raw record for the verified HTTP 404 "no payment records"
     * response, so a later run can see the work was already checked (Q6). The
     * sentinel is <strong>not</strong> zero expenditure.
     */
    public RawUpsert upsertPaymentsAbsentSentinel(long sourceWorkId, Instant retrievedAt, IngestionRun run) {
        return upsert(IngestionEndpoint.WORK_PAYMENTS, sourceWorkId,
                "{\"_state\":\"FETCHED_ABSENT\",\"_note\":\"HTTP 404 no payment records; not zero expenditure\"}",
                (short) 404, retrievedAt, run);
    }

    private RawUpsert upsert(IngestionEndpoint endpoint, long sourceWorkId, String json, short httpStatus,
                             Instant retrievedAt, IngestionRun run) {
        String fingerprint = sha256Hex(json);
        Optional<RawSourceRecord> found = repository.findBySourceNameAndEndpointAndSourceWorkId(
                SourceName.EMPOWERED_INDIAN, endpoint, sourceWorkId);

        if (found.isPresent()) {
            RawSourceRecord existing = found.get();
            boolean changed = !fingerprint.equals(existing.getPayloadFingerprint());
            if (changed) {
                existing.setPayload(json);
                existing.setPayloadFingerprint(fingerprint);
                existing.setHttpStatus(httpStatus);
                existing.setRetrievedAt(retrievedAt);
                existing.setIngestionRun(run);
            }
            return new RawUpsert(true, changed);
        }

        RawSourceRecord record = new RawSourceRecord(
                SourceName.EMPOWERED_INDIAN, endpoint, json, fingerprint, retrievedAt, run);
        record.setSourceWorkId(sourceWorkId);
        record.setHttpStatus(httpStatus);
        repository.save(record);
        return new RawUpsert(false, true);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            // A DTO that cannot be serialised is a bug, not bad source data.
            throw new IllegalStateException("Could not serialise source payload for raw storage", e);
        }
    }

    static String sha256Hex(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
