package com.mpladsentinel.grievance;

import java.time.Instant;

/**
 * A grievance as sent to the frontend. Mirrors the frontend {@code Grievance}
 * type; {@code id} is a string there, so it is stringified here.
 */
public record GrievanceResponse(
        String id,
        Long workReference,
        String category,
        String subject,
        String description,
        String contactName,
        String contactEmail,
        GrievanceStatus status,
        String actionNote,
        Instant submittedAt,
        Instant updatedAt
) {

    static GrievanceResponse from(Grievance g) {
        return new GrievanceResponse(
                String.valueOf(g.getId()),
                g.getWorkReference(),
                g.getCategory(),
                g.getSubject(),
                g.getDescription(),
                g.getContactName(),
                g.getContactEmail(),
                g.getStatus(),
                g.getActionNote(),
                g.getSubmittedAt(),
                g.getUpdatedAt());
    }
}
