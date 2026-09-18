package com.mpladsentinel.recommendation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code PATCH /api/recommendations/{id}}. Mirrors the frontend
 * {@code WorkRecommendationStatusPatch}.
 */
public record UpdateRecommendationStatusRequest(

        @NotNull RecommendationStatus status,

        @Size(max = 5000) String actionNote
) {
}
