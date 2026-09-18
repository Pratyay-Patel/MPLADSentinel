package com.mpladsentinel.escrow;

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
 * One entry in a {@link FundRequest}'s chronological history. Maps
 * {@code fund_request_event} (migration V13) — append-only, never updated or
 * deleted, so a rejected request's history stays permanently visible.
 *
 * <p>Unlike {@code InspectionAssignment} (which reuses a single
 * {@code updated_at} and loses intermediate transition timestamps), this
 * feature writes a dedicated row per event, since the spec explicitly needs a
 * full trail and the future blockchain phase will map these rows onto ledger
 * transactions one-to-one.
 */
@Entity
@Table(name = "fund_request_event")
public class FundRequestEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fund_request_id", nullable = false)
    private Long fundRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 24)
    private FundRequestEventType eventType;

    /** Who caused this event, or {@code null} for the automatic decision events. */
    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(columnDefinition = "text")
    private String detail;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    protected FundRequestEvent() {
    }

    public FundRequestEvent(Long fundRequestId, FundRequestEventType eventType, Long actorUserId, String detail) {
        this.fundRequestId = fundRequestId;
        this.eventType = eventType;
        this.actorUserId = actorUserId;
        this.detail = detail;
    }

    public Long getId() {
        return id;
    }

    public Long getFundRequestId() {
        return fundRequestId;
    }

    public FundRequestEventType getEventType() {
        return eventType;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public String getDetail() {
        return detail;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
