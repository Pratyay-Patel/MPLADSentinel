package com.mpladsentinel.recommendation;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Work-recommendation workflow: a citizen proposes a work (e-SAKSHI-style),
 * MoSPI / State / District move it through {@link RecommendationStatus}. Read
 * visibility is caller-scoped — a citizen sees only their own, every other
 * role sees all. Mirrors {@code GrievanceService}.
 */
@Service
@Transactional
public class WorkRecommendationService {

    /** Must match {@code ck_work_recommendation_category} (V12) and the frontend list. */
    static final Set<String> CATEGORIES = Set.of(
            "Drinking Water & Sanitation", "Roads & Transportation", "Education Infrastructure",
            "Health Infrastructure", "Community & Public Buildings", "Sports Infrastructure",
            "Irrigation & Agriculture", "Electricity & Non-conventional Energy", "Other");

    private static final int MAX_TRACKING_NUMBER_ATTEMPTS = 10;

    private final WorkRecommendationRepository recommendations;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public WorkRecommendationService(WorkRecommendationRepository recommendations, Clock clock) {
        this.recommendations = recommendations;
        this.clock = clock;
    }

    /** All recommendations, newest first. */
    @Transactional(readOnly = true)
    public List<WorkRecommendationResponse> listAll() {
        return recommendations.findAllByOrderBySubmittedAtDesc().stream()
                .map(WorkRecommendationResponse::from).toList();
    }

    /** Recommendations raised by one user, newest first. */
    @Transactional(readOnly = true)
    public List<WorkRecommendationResponse> listOwnedBy(Long userId) {
        return recommendations.findBySubmittedByUserIdOrderBySubmittedAtDesc(userId).stream()
                .map(WorkRecommendationResponse::from).toList();
    }

    /** Record a new recommendation for {@code submitterUserId}. */
    public WorkRecommendationResponse create(CreateWorkRecommendationRequest request, Long submitterUserId) {
        if (!CATEGORIES.contains(request.category())) {
            throw new IllegalArgumentException("Unknown recommendation category: " + request.category());
        }
        WorkRecommendation recommendation = new WorkRecommendation(
                request.fullName().trim(),
                request.mobileNumber().trim(),
                request.state().trim(),
                request.mpName().trim(),
                request.constituency().trim(),
                request.locationCategory(),
                request.gpsCoordinatesLink().trim(),
                request.workTitle().trim(),
                request.category(),
                request.description().trim(),
                generateTrackingNumber());
        recommendation.setEmail(trimToNull(request.email()));
        recommendation.setSubmittedByUserId(submitterUserId);
        return WorkRecommendationResponse.from(recommendations.save(recommendation));
    }

    /**
     * Apply a status + action-note change. Empty {@link Optional} means no
     * recommendation has that id.
     */
    public Optional<WorkRecommendationResponse> updateStatus(long id, UpdateRecommendationStatusRequest request) {
        return recommendations.findById(id).map(recommendation -> {
            recommendation.setStatus(request.status());
            recommendation.setActionNote(trimToNull(request.actionNote()));
            recommendation.touchUpdatedAt();
            return WorkRecommendationResponse.from(recommendations.save(recommendation));
        });
    }

    /** {@code CIT-<year>-<6 random digits>}, retried on the (extremely unlikely) collision. */
    private String generateTrackingNumber() {
        int year = Year.now(clock).getValue();
        for (int attempt = 0; attempt < MAX_TRACKING_NUMBER_ATTEMPTS; attempt++) {
            String candidate = "CIT-" + year + "-" + String.format("%06d", random.nextInt(1_000_000));
            if (!recommendations.existsByTrackingNumber(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique tracking number.");
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
