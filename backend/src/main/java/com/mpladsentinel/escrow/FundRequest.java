package com.mpladsentinel.escrow;

import java.math.BigDecimal;
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
 * A District Officer's installment/fund-release request for a work. Maps
 * {@code fund_request} (migration V13). User-generated application data —
 * not ingested MPLADS source data.
 *
 * <p>{@code sourceWorkId} is a source work id, deliberately not a JPA
 * association: the referenced {@code work} row may not have been ingested
 * (same rule as {@code Grievance.workReference} /
 * {@code InspectionAssignment.sourceWorkId}).
 *
 * <p>{@code status}/{@code decisionReason}/{@code decidedAt} are set once, at
 * construction, by {@link FundEligibilityEngine} — there is no later manual
 * approve/reject transition.
 */
@Entity
@Table(name = "fund_request")
public class FundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_work_id", nullable = false)
    private Long sourceWorkId;

    @Column(name = "requested_by_user_id", nullable = false)
    private Long requestedByUserId;

    @Column(name = "requested_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal requestedAmount;

    @Column(columnDefinition = "text")
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private FundRequestStatus status;

    @Column(name = "decision_reason", nullable = false, columnDefinition = "text")
    private String decisionReason;

    @Column(name = "decided_at", nullable = false)
    private Instant decidedAt;

    @Column(name = "release_notice_sent", nullable = false)
    private boolean releaseNoticeSent = false;

    @Column(name = "release_notice_by_user_id")
    private Long releaseNoticeByUserId;

    @Column(name = "release_notice_at")
    private Instant releaseNoticeAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected FundRequest() {
    }

    public FundRequest(Long sourceWorkId, Long requestedByUserId, BigDecimal requestedAmount, String remarks) {
        this.sourceWorkId = sourceWorkId;
        this.requestedByUserId = requestedByUserId;
        this.requestedAmount = requestedAmount;
        this.remarks = remarks;
    }

    public Long getId() {
        return id;
    }

    public Long getSourceWorkId() {
        return sourceWorkId;
    }

    public Long getRequestedByUserId() {
        return requestedByUserId;
    }

    public BigDecimal getRequestedAmount() {
        return requestedAmount;
    }

    public String getRemarks() {
        return remarks;
    }

    public FundRequestStatus getStatus() {
        return status;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    /** Applies the (one-time, immediate) eligibility decision. */
    public void decide(FundRequestStatus status, String reason, Instant at) {
        this.status = status;
        this.decisionReason = reason;
        this.decidedAt = at;
    }

    public boolean isReleaseNoticeSent() {
        return releaseNoticeSent;
    }

    public Long getReleaseNoticeByUserId() {
        return releaseNoticeByUserId;
    }

    public Instant getReleaseNoticeAt() {
        return releaseNoticeAt;
    }

    /** Records that the (already-approved) release notice was sent to the bank — a DB flag only. */
    public void markReleaseNoticeSent(Long byUserId, Instant at) {
        this.releaseNoticeSent = true;
        this.releaseNoticeByUserId = byUserId;
        this.releaseNoticeAt = at;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void touchUpdatedAt() {
        this.updatedAt = Instant.now();
    }
}
