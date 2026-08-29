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

/**
 * A source record that failed validation / normalisation, retained so an
 * ingestion run can continue past bad input without losing the data.
 *
 * <p>Maps {@code ingestion_dead_letter} (migration V2).
 */
@Entity
@Table(name = "ingestion_dead_letter")
public class IngestionDeadLetter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingestion_run_id", nullable = false)
    private IngestionRun ingestionRun;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private IngestionEndpoint endpoint;

    private Long sourceWorkId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String rawPayload;

    @Column(nullable = false, length = 48)
    private String errorType;

    @Column(columnDefinition = "text")
    private String errorDetail;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected IngestionDeadLetter() {
    }

    public IngestionDeadLetter(IngestionRun ingestionRun,
                               IngestionEndpoint endpoint,
                               String rawPayload,
                               String errorType) {
        this.ingestionRun = ingestionRun;
        this.endpoint = endpoint;
        this.rawPayload = rawPayload;
        this.errorType = errorType;
    }

    public Long getId() {
        return id;
    }

    public IngestionRun getIngestionRun() {
        return ingestionRun;
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

    public String getRawPayload() {
        return rawPayload;
    }

    public void setRawPayload(String rawPayload) {
        this.rawPayload = rawPayload;
    }

    public String getErrorType() {
        return errorType;
    }

    public void setErrorType(String errorType) {
        this.errorType = errorType;
    }

    public String getErrorDetail() {
        return errorDetail;
    }

    public void setErrorDetail(String errorDetail) {
        this.errorDetail = errorDetail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
