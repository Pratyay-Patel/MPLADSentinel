package com.mpladsentinel.notification;

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
 * An in-app notification for the header bell. Maps {@code notification}
 * (migration V11). Application-generated — not ingested MPLADS source data.
 */
@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private NotificationCategory category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Column(name = "source_work_id")
    private Long sourceWorkId;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(nullable = false)
    private boolean dismissed = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Notification() {
    }

    public Notification(Long recipientUserId, NotificationCategory category, String title,
                        String message, Long sourceWorkId) {
        this.recipientUserId = recipientUserId;
        this.category = category;
        this.title = title;
        this.message = message;
        this.sourceWorkId = sourceWorkId;
    }

    public Long getId() {
        return id;
    }

    public Long getRecipientUserId() {
        return recipientUserId;
    }

    public NotificationCategory getCategory() {
        return category;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public Long getSourceWorkId() {
        return sourceWorkId;
    }

    public boolean isRead() {
        return read;
    }

    public void markRead() {
        this.read = true;
    }

    public boolean isDismissed() {
        return dismissed;
    }

    public void dismiss() {
        this.dismissed = true;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
