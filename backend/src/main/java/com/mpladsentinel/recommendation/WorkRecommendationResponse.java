package com.mpladsentinel.recommendation;

import java.time.Instant;

/**
 * A work recommendation as sent to the frontend. Mirrors the frontend
 * {@code WorkRecommendation} type; {@code id} is a string there, so it is
 * stringified here.
 */
public record WorkRecommendationResponse(
        String id,
        String fullName,
        String mobileNumber,
        String email,
        String state,
        String mpName,
        String constituency,
        LocationCategory locationCategory,
        String gpsCoordinatesLink,
        String workTitle,
        String category,
        String description,
        String trackingNumber,
        RecommendationStatus status,
        String actionNote,
        Instant submittedAt,
        Instant updatedAt
) {

    static WorkRecommendationResponse from(WorkRecommendation r) {
        return new WorkRecommendationResponse(
                String.valueOf(r.getId()),
                r.getFullName(),
                r.getMobileNumber(),
                r.getEmail(),
                r.getState(),
                r.getMpName(),
                r.getConstituency(),
                r.getLocationCategory(),
                r.getGpsCoordinatesLink(),
                r.getWorkTitle(),
                r.getCategory(),
                r.getDescription(),
                r.getTrackingNumber(),
                r.getStatus(),
                r.getActionNote(),
                r.getSubmittedAt(),
                r.getUpdatedAt());
    }
}
