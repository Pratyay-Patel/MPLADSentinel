package com.mpladsentinel.recommendation;

/**
 * Review lifecycle of a citizen work recommendation. Matches
 * {@code ck_work_recommendation_status} (migration V12) and the frontend
 * {@code WorkRecommendationStatus} union.
 */
public enum RecommendationStatus {
    SUBMITTED,
    UNDER_REVIEW,
    RECOMMENDED,
    REJECTED
}
