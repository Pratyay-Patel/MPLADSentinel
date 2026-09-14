package com.mpladsentinel.inspection;

import java.time.Instant;
import java.time.LocalDate;

/**
 * An inspection assignment as sent to the frontend. Mirrors the frontend
 * {@code InspectionAssignment} type; {@code id} is a string there, so it is
 * stringified here (same convention as {@code GrievanceResponse}).
 *
 * <p>{@code workTitle}, {@code officerName} and {@code assignedByName} are joined
 * in so the list screens do not need extra lookups. The Audit Trail page renders
 * only the <em>date</em> portion of {@code assignedAt} / {@code updatedAt}.
 *
 * <p>The {@code pending*} fields (migration V10) are non-null only while this
 * assignment is awaiting a second authority's dual-sign-off confirmation to
 * complete or cancel. {@code pendingRequestedByUsername} lets the frontend
 * proactively hide the confirm action for the user who made the request —
 * the backend enforces the same rule regardless.
 */
public record AssignmentResponse(
        String id,
        Long sourceWorkId,
        String workTitle,
        String officerCode,
        String officerName,
        String assignedByName,
        AssignmentStatus status,
        LocalDate dueDate,
        String note,
        int requiredPhotos,
        Instant assignedAt,
        Instant updatedAt,
        AssignmentStatus pendingStatus,
        String pendingRequestedByUsername,
        String pendingRequestedByName,
        String pendingJustification,
        Instant pendingRequestedAt
) {
}
