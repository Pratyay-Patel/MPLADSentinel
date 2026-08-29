package com.mpladsentinel.mplads.domain;

import java.time.Instant;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * The latest verbatim payload for one source record, kept so normalisation can
 * be re-run and provenance audited without re-fetching a rate-limited third
 * party.
 *
 * <p>Maps {@code raw_source_record} (migration V2).
 */
@Entity
@Table(name = "raw_source_record",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_raw_source_record_natural",
                columnNames = {"source_name", "endpoint", "source_work_id"}))
public class RawSourceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32)
    private String sourceName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private IngestionEndpoint endpoint;

    /** {@code workId} / {@code work_id} / path id, extracted for lookup; NULL if unextractable. */
    private Long sourceWorkId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(nullable = false, length = 64)
    private String payloadFingerprint;

    private Short httpStatus;

    @Column(nullable = false)
    private Instant retrievedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingestion_run_id", nullable = false)
    private IngestionRun ingestionRun;

    protected RawSourceRecord() {
    }

    public RawSourceRecord(String sourceName,
                           IngestionEndpoint endpoint,
                           String payload,
                           String payloadFingerprint,
                           Instant retrievedAt,
                           IngestionRun ingestionRun) {
        this.sourceName = sourceName;
        this.endpoint = endpoint;
        this.payload = payload;
        this.payloadFingerprint = payloadFingerprint;
        this.retrievedAt = retrievedAt;
        this.ingestionRun = ingestionRun;
    }

    public Long getId() {
        return id;
    }

    public String getSourceName() {
        return sourceName;
    }

    public IngestionEndpoint getEndpoint() {
        return endpoint;
    }

    public Long getSourceWorkId() {
        return sourceWorkId;
    }

    public void setSourceWorkId(Long sourceWorkId) {
        this.sourceWorkId = sourceWorkId;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public String getPayloadFingerprint() {
        return payloadFingerprint;
    }

    public void setPayloadFingerprint(String payloadFingerprint) {
        this.payloadFingerprint = payloadFingerprint;
    }

    public Short getHttpStatus() {
        return httpStatus;
    }

    public void setHttpStatus(Short httpStatus) {
        this.httpStatus = httpStatus;
    }

    public Instant getRetrievedAt() {
        return retrievedAt;
    }

    public void setRetrievedAt(Instant retrievedAt) {
        this.retrievedAt = retrievedAt;
    }

    public IngestionRun getIngestionRun() {
        return ingestionRun;
    }

    public void setIngestionRun(IngestionRun ingestionRun) {
        this.ingestionRun = ingestionRun;
    }
}
