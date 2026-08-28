package com.mpladsentinel.mplads.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * A single logical MPLADS work ("project"), assembled from the Empowered Indian
 * recommended and/or completed listings.
 *
 * <p>Maps {@code work} (migration V3). Key points carried over from the design:
 * <ul>
 *   <li>{@link #sourceWorkId} is the source's numeric id; its relationship to an
 *       official MPLADS / e-SAKSHI identifier is <strong>unknown</strong>, so it
 *       is never treated as an official id.</li>
 *   <li>{@link #estimatedCost} (recommended) and {@link #finalCost} (completed)
 *       are kept as two distinct concepts and never merged.</li>
 *   <li>{@link #paymentDataState} keeps "no expenditure known" separate from
 *       "&#8377;0 spent".</li>
 *   <li>There are deliberately no columns for sanctioned amount, sanction
 *       number/date or physical-progress percentage &mdash; no accessible source
 *       provides them at work level.</li>
 * </ul>
 */
@Entity
@Table(name = "work",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_work_source_natural",
                columnNames = {"source_name", "source_work_id"}))
public class Work {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- identity / source ---------------------------------------------------

    @Column(nullable = false, length = 32)
    private String sourceName;

    @Column(nullable = false)
    private Long sourceWorkId;

    // --- descriptive -------------------------------------------------------

    @Column(columnDefinition = "text")
    private String workDescription;

    @Column(length = 128)
    private String category;
    @Column(length = 128)
    private String categoryNormalized;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private House house;

    private Short lsTerm;

    @Column(length = 256)
    private String mpName;
    @Column(length = 256)
    private String mpNameNormalized;
    @Column(length = 256)
    private String constituency;
    @Column(length = 256)
    private String constituencyNormalized;
    @Column(length = 128)
    private String state;
    @Column(length = 128)
    private String stateNormalized;
    @Column(length = 128)
    private String district;
    @Column(length = 128)
    private String districtNormalized;

    @Column(columnDefinition = "text")
    private String locationRaw;
    @Column(columnDefinition = "text")
    private String implementingAuthorityText;

    // --- financial -------------------------------------------------------

    @Column(precision = 15, scale = 2)
    private BigDecimal estimatedCost;
    @Column(precision = 15, scale = 2)
    private BigDecimal finalCost;
    @Column(nullable = false, length = 3)
    private String currency = "INR";

    // --- temporal (day precision) -------------------------------------------

    private LocalDate recommendedOn;
    private Short recommendedYear;
    private LocalDate completedOn;
    private Short completionYear;

    // --- status / lifecycle ----------------------------------------------

    @Column(length = 64)
    private String sourceStatusRaw;

    private Integer expectedBeneficiaries;

    @Column(nullable = false)
    private boolean seenInRecommended = false;
    @Column(nullable = false)
    private boolean seenInCompleted = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 28)
    private LifecycleState lifecycleState;

    // --- inline payment signal from /recommended --------------------------

    private Boolean recHasPayments;
    @Column(precision = 15, scale = 2)
    private BigDecimal recTotalPaid;
    private Integer recPaymentCount;

    // --- payment rollup from /works/{id}/payments -----------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentDataState paymentDataState = PaymentDataState.NOT_FETCHED;

    @Column(precision = 15, scale = 2)
    private BigDecimal paymentTotalPaid;
    private Integer paymentInstallments;
    private Integer paymentSuccessfulCount;
    private Integer paymentPendingCount;
    private LocalDate paymentFirstOn;
    private LocalDate paymentLastOn;
    @Column(columnDefinition = "text")
    private String paymentSchemeDescription;

    // --- data quality ----------------------------------------------------

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "data_quality_flags", nullable = false, columnDefinition = "text[]")
    private String[] dataQualityFlags = new String[0];

    // --- provenance ----------------------------------------------------

    private Instant sourceResponseAt;

    @Column(nullable = false)
    private Instant firstIngestedAt = Instant.now();

    @Column(nullable = false)
    private Instant lastIngestedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "last_ingestion_run_id", nullable = false)
    private IngestionRun lastIngestionRun;

    // --- row audit -----------------------------------------------------

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    protected Work() {
    }

    public Work(String sourceName,
                long sourceWorkId,
                LifecycleState lifecycleState,
                boolean seenInRecommended,
                boolean seenInCompleted,
                IngestionRun lastIngestionRun) {
        this.sourceName = sourceName;
        this.sourceWorkId = sourceWorkId;
        this.lifecycleState = lifecycleState;
        this.seenInRecommended = seenInRecommended;
        this.seenInCompleted = seenInCompleted;
        this.lastIngestionRun = lastIngestionRun;
    }

    public Long getId() {
        return id;
    }

    public String getSourceName() {
        return sourceName;
    }

    public Long getSourceWorkId() {
        return sourceWorkId;
    }

    public String getWorkDescription() {
        return workDescription;
    }

    public void setWorkDescription(String workDescription) {
        this.workDescription = workDescription;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getCategoryNormalized() {
        return categoryNormalized;
    }

    public void setCategoryNormalized(String categoryNormalized) {
        this.categoryNormalized = categoryNormalized;
    }

    public House getHouse() {
        return house;
    }

    public void setHouse(House house) {
        this.house = house;
    }

    public Short getLsTerm() {
        return lsTerm;
    }

    public void setLsTerm(Short lsTerm) {
        this.lsTerm = lsTerm;
    }

    public String getMpName() {
        return mpName;
    }

    public void setMpName(String mpName) {
        this.mpName = mpName;
    }

    public String getMpNameNormalized() {
        return mpNameNormalized;
    }

    public void setMpNameNormalized(String mpNameNormalized) {
        this.mpNameNormalized = mpNameNormalized;
    }

    public String getConstituency() {
        return constituency;
    }

    public void setConstituency(String constituency) {
        this.constituency = constituency;
    }

    public String getConstituencyNormalized() {
        return constituencyNormalized;
    }

    public void setConstituencyNormalized(String constituencyNormalized) {
        this.constituencyNormalized = constituencyNormalized;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getStateNormalized() {
        return stateNormalized;
    }

    public void setStateNormalized(String stateNormalized) {
        this.stateNormalized = stateNormalized;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getDistrictNormalized() {
        return districtNormalized;
    }

    public void setDistrictNormalized(String districtNormalized) {
        this.districtNormalized = districtNormalized;
    }

    public String getLocationRaw() {
        return locationRaw;
    }

    public void setLocationRaw(String locationRaw) {
        this.locationRaw = locationRaw;
    }

    public String getImplementingAuthorityText() {
        return implementingAuthorityText;
    }

    public void setImplementingAuthorityText(String implementingAuthorityText) {
        this.implementingAuthorityText = implementingAuthorityText;
    }

    public BigDecimal getEstimatedCost() {
        return estimatedCost;
    }

    public void setEstimatedCost(BigDecimal estimatedCost) {
        this.estimatedCost = estimatedCost;
    }

    public BigDecimal getFinalCost() {
        return finalCost;
    }

    public void setFinalCost(BigDecimal finalCost) {
        this.finalCost = finalCost;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public LocalDate getRecommendedOn() {
        return recommendedOn;
    }

    public void setRecommendedOn(LocalDate recommendedOn) {
        this.recommendedOn = recommendedOn;
    }

    public Short getRecommendedYear() {
        return recommendedYear;
    }

    public void setRecommendedYear(Short recommendedYear) {
        this.recommendedYear = recommendedYear;
    }

    public LocalDate getCompletedOn() {
        return completedOn;
    }

    public void setCompletedOn(LocalDate completedOn) {
        this.completedOn = completedOn;
    }

    public Short getCompletionYear() {
        return completionYear;
    }

    public void setCompletionYear(Short completionYear) {
        this.completionYear = completionYear;
    }

    public String getSourceStatusRaw() {
        return sourceStatusRaw;
    }

    public void setSourceStatusRaw(String sourceStatusRaw) {
        this.sourceStatusRaw = sourceStatusRaw;
    }

    public Integer getExpectedBeneficiaries() {
        return expectedBeneficiaries;
    }

    public void setExpectedBeneficiaries(Integer expectedBeneficiaries) {
        this.expectedBeneficiaries = expectedBeneficiaries;
    }

    public boolean isSeenInRecommended() {
        return seenInRecommended;
    }

    public void setSeenInRecommended(boolean seenInRecommended) {
        this.seenInRecommended = seenInRecommended;
    }

    public boolean isSeenInCompleted() {
        return seenInCompleted;
    }

    public void setSeenInCompleted(boolean seenInCompleted) {
        this.seenInCompleted = seenInCompleted;
    }

    public LifecycleState getLifecycleState() {
        return lifecycleState;
    }

    public void setLifecycleState(LifecycleState lifecycleState) {
        this.lifecycleState = lifecycleState;
    }

    public Boolean getRecHasPayments() {
        return recHasPayments;
    }

    public void setRecHasPayments(Boolean recHasPayments) {
        this.recHasPayments = recHasPayments;
    }

    public BigDecimal getRecTotalPaid() {
        return recTotalPaid;
    }

    public void setRecTotalPaid(BigDecimal recTotalPaid) {
        this.recTotalPaid = recTotalPaid;
    }

    public Integer getRecPaymentCount() {
        return recPaymentCount;
    }

    public void setRecPaymentCount(Integer recPaymentCount) {
        this.recPaymentCount = recPaymentCount;
    }

    public PaymentDataState getPaymentDataState() {
        return paymentDataState;
    }

    public void setPaymentDataState(PaymentDataState paymentDataState) {
        this.paymentDataState = paymentDataState;
    }

    public BigDecimal getPaymentTotalPaid() {
        return paymentTotalPaid;
    }

    public void setPaymentTotalPaid(BigDecimal paymentTotalPaid) {
        this.paymentTotalPaid = paymentTotalPaid;
    }

    public Integer getPaymentInstallments() {
        return paymentInstallments;
    }

    public void setPaymentInstallments(Integer paymentInstallments) {
        this.paymentInstallments = paymentInstallments;
    }

    public Integer getPaymentSuccessfulCount() {
        return paymentSuccessfulCount;
    }

    public void setPaymentSuccessfulCount(Integer paymentSuccessfulCount) {
        this.paymentSuccessfulCount = paymentSuccessfulCount;
    }

    public Integer getPaymentPendingCount() {
        return paymentPendingCount;
    }

    public void setPaymentPendingCount(Integer paymentPendingCount) {
        this.paymentPendingCount = paymentPendingCount;
    }

    public LocalDate getPaymentFirstOn() {
        return paymentFirstOn;
    }

    public void setPaymentFirstOn(LocalDate paymentFirstOn) {
        this.paymentFirstOn = paymentFirstOn;
    }

    public LocalDate getPaymentLastOn() {
        return paymentLastOn;
    }

    public void setPaymentLastOn(LocalDate paymentLastOn) {
        this.paymentLastOn = paymentLastOn;
    }

    public String getPaymentSchemeDescription() {
        return paymentSchemeDescription;
    }

    public void setPaymentSchemeDescription(String paymentSchemeDescription) {
        this.paymentSchemeDescription = paymentSchemeDescription;
    }

    public String[] getDataQualityFlags() {
        return dataQualityFlags;
    }

    public void setDataQualityFlags(String[] dataQualityFlags) {
        this.dataQualityFlags = dataQualityFlags != null ? dataQualityFlags : new String[0];
    }

    public Instant getSourceResponseAt() {
        return sourceResponseAt;
    }

    public void setSourceResponseAt(Instant sourceResponseAt) {
        this.sourceResponseAt = sourceResponseAt;
    }

    public Instant getFirstIngestedAt() {
        return firstIngestedAt;
    }

    public void setFirstIngestedAt(Instant firstIngestedAt) {
        this.firstIngestedAt = firstIngestedAt;
    }

    public Instant getLastIngestedAt() {
        return lastIngestedAt;
    }

    public void setLastIngestedAt(Instant lastIngestedAt) {
        this.lastIngestedAt = lastIngestedAt;
    }

    public IngestionRun getLastIngestionRun() {
        return lastIngestionRun;
    }

    public void setLastIngestionRun(IngestionRun lastIngestionRun) {
        this.lastIngestionRun = lastIngestionRun;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
