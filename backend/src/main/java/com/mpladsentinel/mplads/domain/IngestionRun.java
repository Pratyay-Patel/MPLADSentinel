package com.mpladsentinel.mplads.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One execution of an external-data ingestion. Stamped onto every work / payment
 * / raw record it produces, giving full lineage back to a retrieval.
 *
 * <p>Maps {@code ingestion_run} (migration V2).
 */
@Entity
@Table(name = "ingestion_run")
public class IngestionRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32)
    private String sourceName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private IngestionEndpoint endpoint;

    @Column(nullable = false, columnDefinition = "text")
    private String apiBaseUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private IngestionTrigger triggerType;

    /** FK to the application user is added in the RBAC phase. */
    private Long triggeredByUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private IngestionRunStatus status;

    @Column(nullable = false)
    private Instant startedAt = Instant.now();

    private Instant finishedAt;

    private Short pageSize;
    private Integer firstPage;
    private Integer lastPageCompleted;

    @Column(nullable = false)
    private int pagesFetched = 0;
    @Column(nullable = false)
    private int recordsSeen = 0;
    @Column(nullable = false)
    private int recordsInserted = 0;
    @Column(nullable = false)
    private int recordsUpdated = 0;
    @Column(nullable = false)
    private int recordsUnchanged = 0;
    @Column(nullable = false)
    private int recordsDeadLettered = 0;

    /** The source's reported {@code pagination.totalCount} at run time. Diagnostics only. */
    private Integer sourceReportedTotalCount;

    @Column(nullable = false)
    private int httpErrorCount = 0;
    @Column(nullable = false)
    private int retryCount = 0;

    @Column(columnDefinition = "text")
    private String errorSummary;
    @Column(columnDefinition = "text")
    private String notes;

    protected IngestionRun() {
    }

    public IngestionRun(String sourceName,
                        IngestionEndpoint endpoint,
                        String apiBaseUrl,
                        IngestionTrigger triggerType,
                        IngestionRunStatus status) {
        this.sourceName = sourceName;
        this.endpoint = endpoint;
        this.apiBaseUrl = apiBaseUrl;
        this.triggerType = triggerType;
        this.status = status;
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

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public IngestionTrigger getTriggerType() {
        return triggerType;
    }

    public Long getTriggeredByUserId() {
        return triggeredByUserId;
    }

    public void setTriggeredByUserId(Long triggeredByUserId) {
        this.triggeredByUserId = triggeredByUserId;
    }

    public IngestionRunStatus getStatus() {
        return status;
    }

    public void setStatus(IngestionRunStatus status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public Short getPageSize() {
        return pageSize;
    }

    public void setPageSize(Short pageSize) {
        this.pageSize = pageSize;
    }

    public Integer getFirstPage() {
        return firstPage;
    }

    public void setFirstPage(Integer firstPage) {
        this.firstPage = firstPage;
    }

    public Integer getLastPageCompleted() {
        return lastPageCompleted;
    }

    public void setLastPageCompleted(Integer lastPageCompleted) {
        this.lastPageCompleted = lastPageCompleted;
    }

    public int getPagesFetched() {
        return pagesFetched;
    }

    public void setPagesFetched(int pagesFetched) {
        this.pagesFetched = pagesFetched;
    }

    public int getRecordsSeen() {
        return recordsSeen;
    }

    public void setRecordsSeen(int recordsSeen) {
        this.recordsSeen = recordsSeen;
    }

    public int getRecordsInserted() {
        return recordsInserted;
    }

    public void setRecordsInserted(int recordsInserted) {
        this.recordsInserted = recordsInserted;
    }

    public int getRecordsUpdated() {
        return recordsUpdated;
    }

    public void setRecordsUpdated(int recordsUpdated) {
        this.recordsUpdated = recordsUpdated;
    }

    public int getRecordsUnchanged() {
        return recordsUnchanged;
    }

    public void setRecordsUnchanged(int recordsUnchanged) {
        this.recordsUnchanged = recordsUnchanged;
    }

    public int getRecordsDeadLettered() {
        return recordsDeadLettered;
    }

    public void setRecordsDeadLettered(int recordsDeadLettered) {
        this.recordsDeadLettered = recordsDeadLettered;
    }

    public Integer getSourceReportedTotalCount() {
        return sourceReportedTotalCount;
    }

    public void setSourceReportedTotalCount(Integer sourceReportedTotalCount) {
        this.sourceReportedTotalCount = sourceReportedTotalCount;
    }

    public int getHttpErrorCount() {
        return httpErrorCount;
    }

    public void setHttpErrorCount(int httpErrorCount) {
        this.httpErrorCount = httpErrorCount;
    }

    public int getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(int retryCount) {
        this.retryCount = retryCount;
    }

    public String getErrorSummary() {
        return errorSummary;
    }

    public void setErrorSummary(String errorSummary) {
        this.errorSummary = errorSummary;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
