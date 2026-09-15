package com.mpladsentinel.notification;

import java.time.Instant;

/**
 * A notification as sent to the frontend. Mirrors the frontend
 * {@code AppNotification} type; {@code id} is a string there, so it is
 * stringified here.
 */
public record NotificationResponse(
        String id,
        NotificationCategory category,
        String title,
        String message,
        Long sourceWorkId,
        boolean read,
        Instant createdAt
) {

    static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                String.valueOf(n.getId()),
                n.getCategory(),
                n.getTitle(),
                n.getMessage(),
                n.getSourceWorkId(),
                n.isRead(),
                n.getCreatedAt());
    }
}
