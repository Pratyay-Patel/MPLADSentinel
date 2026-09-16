package com.mpladsentinel.recommendation;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link WorkRecommendation}. */
public interface WorkRecommendationRepository extends JpaRepository<WorkRecommendation, Long> {

    List<WorkRecommendation> findAllByOrderBySubmittedAtDesc();

    List<WorkRecommendation> findBySubmittedByUserIdOrderBySubmittedAtDesc(Long submittedByUserId);

    boolean existsByTrackingNumber(String trackingNumber);
}
