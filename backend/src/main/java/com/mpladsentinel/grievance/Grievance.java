package com.mpladsentinel.grievance;

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
 * A citizen grievance against an MPLADS work. Maps {@code grievance} (migration
 * V6). User-generated application data — not ingested MPLADS source data.
 */
@Entity
@Table(name = "grievance")
public class Grievance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_reference")
    private Long workReference;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "contact_name", length = 128)
    private String contactName;

    @Column(name = "contact_email", length = 256)
    private String contactEmail;

    @Column(name = "submitted_by_user_id")
    private Long submittedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private GrievanceStatus status = GrievanceStatus.SUBMITTED;

    @Column(name = "action_note", columnDefinition = "text")
    private String actionNote;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Grievance() {
    }

    public Grievance(String category, String subject, String description) {
        this.category = category;
        this.subject = subject;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public Long getWorkReference() {
        return workReference;
    }

    public void setWorkReference(Long workReference) {
        this.workReference = workReference;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public Long getSubmittedByUserId() {
        return submittedByUserId;
    }

    public void setSubmittedByUserId(Long submittedByUserId) {
        this.submittedByUserId = submittedByUserId;
    }

    public GrievanceStatus getStatus() {
        return status;
    }

    public void setStatus(GrievanceStatus status) {
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
