package com.mpladsentinel.recommendation;

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
 * A citizen's recommendation for a new MPLADS work (e-SAKSHI-style). Maps
 * {@code work_recommendation} (migration V12). User-generated application
 * data — not ingested MPLADS source data.
 */
@Entity
@Table(name = "work_recommendation")
public class WorkRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 128)
    private String fullName;

    @Column(name = "mobile_number", nullable = false, length = 16)
    private String mobileNumber;

    @Column(length = 256)
    private String email;

    @Column(nullable = false, length = 64)
    private String state;

    @Column(name = "mp_name", nullable = false, length = 128)
    private String mpName;

    @Column(nullable = false, length = 128)
    private String constituency;

    @Enumerated(EnumType.STRING)
    @Column(name = "location_category", nullable = false, length = 8)
    private LocationCategory locationCategory;

    @Column(name = "gps_coordinates_link", nullable = false, columnDefinition = "text")
    private String gpsCoordinatesLink;

    @Column(name = "work_title", nullable = false, length = 200)
    private String workTitle;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "submitted_by_user_id")
    private Long submittedByUserId;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 32)
    private String trackingNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RecommendationStatus status = RecommendationStatus.SUBMITTED;

    @Column(name = "action_note", columnDefinition = "text")
    private String actionNote;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected WorkRecommendation() {
    }

    public WorkRecommendation(String fullName, String mobileNumber, String state, String mpName,
                              String constituency, LocationCategory locationCategory,
                              String gpsCoordinatesLink, String workTitle, String category,
                              String description, String trackingNumber) {
        this.fullName = fullName;
        this.mobileNumber = mobileNumber;
        this.state = state;
        this.mpName = mpName;
        this.constituency = constituency;
        this.locationCategory = locationCategory;
        this.gpsCoordinatesLink = gpsCoordinatesLink;
        this.workTitle = workTitle;
        this.category = category;
        this.description = description;
        this.trackingNumber = trackingNumber;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getState() {
        return state;
    }

    public String getMpName() {
        return mpName;
    }

    public String getConstituency() {
        return constituency;
    }

    public LocationCategory getLocationCategory() {
        return locationCategory;
    }

    public String getGpsCoordinatesLink() {
        return gpsCoordinatesLink;
    }

    public String getWorkTitle() {
        return workTitle;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public Long getSubmittedByUserId() {
        return submittedByUserId;
    }

    public void setSubmittedByUserId(Long submittedByUserId) {
        this.submittedByUserId = submittedByUserId;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public RecommendationStatus getStatus() {
        return status;
    }

    public void setStatus(RecommendationStatus status) {
        this.status = status;
    }

    public String getActionNote() {
        return actionNote;
    }

    public void setActionNote(String actionNote) {
        this.actionNote = actionNote;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void touchUpdatedAt() {
        this.updatedAt = Instant.now();
    }
}
