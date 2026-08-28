package com.mpladsentinel.mplads.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

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
 * One MPLADS payment installment for a {@link Work}, from
 * {@code GET /api/works/{workId}/payments -> data.allPayments[]}.
 *
 * <p>Maps {@code work_payment} (migration V4). A work may have zero, one or many
 * of these. Zero rows does <strong>not</strong> mean zero expenditure &mdash;
 * that distinction lives in {@link Work#getPaymentDataState()}.
 *
 * <p>The source exposes no payment id, so {@link #sourceFingerprint} (a content
 * hash) is the idempotency key together with the owning work.
 */
@Entity
@Table(name = "work_payment",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_work_payment_natural",
                columnNames = {"work_id", "source_fingerprint"}))
public class WorkPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_id", nullable = false)
    private Work work;

    /** Position within {@code allPayments[]} as returned; may be unstable across runs. */
    private Short sourceOrdinal;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "INR";

    private LocalDate paidOn;

    @Column(length = 64)
    private String statusRaw;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private PaymentStatus status;

    @Column(length = 256)
    private String vendorName;
    @Column(length = 256)
    private String vendorNameNormalized;

    @Column(columnDefinition = "text")
    private String implementingAuthorityText;

    @Column(nullable = false, length = 64)
    private String sourceFingerprint;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingestion_run_id", nullable = false)
    private IngestionRun ingestionRun;

    @Column(nullable = false)
    private Instant ingestedAt = Instant.now();

    protected WorkPayment() {
    }

    public WorkPayment(Work work,
                       BigDecimal amount,
                       String sourceFingerprint,
                       IngestionRun ingestionRun) {
        this.work = work;
        this.amount = amount;
        this.sourceFingerprint = sourceFingerprint;
        this.ingestionRun = ingestionRun;
    }

    public Long getId() {
        return id;
    }

    public Work getWork() {
        return work;
    }

    public void setWork(Work work) {
        this.work = work;
    }

    public Short getSourceOrdinal() {
        return sourceOrdinal;
    }

    public void setSourceOrdinal(Short sourceOrdinal) {
        this.sourceOrdinal = sourceOrdinal;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public LocalDate getPaidOn() {
        return paidOn;
    }

    public void setPaidOn(LocalDate paidOn) {
        this.paidOn = paidOn;
    }

    public String getStatusRaw() {
        return statusRaw;
    }

    public void setStatusRaw(String statusRaw) {
        this.statusRaw = statusRaw;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public String getVendorName() {
        return vendorName;
    }

    public void setVendorName(String vendorName) {
        this.vendorName = vendorName;
    }

    public String getVendorNameNormalized() {
        return vendorNameNormalized;
    }

    public void setVendorNameNormalized(String vendorNameNormalized) {
        this.vendorNameNormalized = vendorNameNormalized;
    }

    public String getImplementingAuthorityText() {
        return implementingAuthorityText;
    }

    public void setImplementingAuthorityText(String implementingAuthorityText) {
        this.implementingAuthorityText = implementingAuthorityText;
    }

    public String getSourceFingerprint() {
        return sourceFingerprint;
    }

    public void setSourceFingerprint(String sourceFingerprint) {
        this.sourceFingerprint = sourceFingerprint;
    }

    public IngestionRun getIngestionRun() {
        return ingestionRun;
    }

    public void setIngestionRun(IngestionRun ingestionRun) {
        this.ingestionRun = ingestionRun;
    }

    public Instant getIngestedAt() {
        return ingestedAt;
    }

    public void setIngestedAt(Instant ingestedAt) {
        this.ingestedAt = ingestedAt;
    }
}
