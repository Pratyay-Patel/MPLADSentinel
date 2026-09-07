package com.mpladsentinel.inspection;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * An authority-requested field inspection of an MPLADS work. Maps
 * {@code inspection_assignment} (migration V8). User-generated application data —
 * not ingested MPLADS source data.
 *
 * <p>{@code sourceWorkId} is a source work id, deliberately not a JPA
 * association: the referenced {@code work} row may not have been ingested (same
 * rule as {@code Grievance.workReference}).
 */
@Entity
@Table(name = "inspection_assignment")
public class InspectionAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_work_id", nullable = false)
    private Long sourceWorkId;

    @Column(name = "officer_id", nullable = false)
    private Long officerId;

    @Column(name = "assigned_by_user_id", nullable = false)
    private Long assignedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AssignmentStatus status = AssignmentStatus.ASSIGNED;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(columnDefinition = "text")
    private String note;

    /** How many field-evidence photos this inspection calls for (1–20). */
    @Column(name = "required_photos", nullable = false)
    private short requiredPhotos = 2;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected InspectionAssignment() {
    }

    public InspectionAssignment(Long sourceWorkId, Long officerId, Long assignedByUserId) {
        this.sourceWorkId = sourceWorkId;
        this.officerId = officerId;
        this.assignedByUserId = assignedByUserId;
    }

    public Long getId() {
        return id;
    }

    public Long getSourceWorkId() {
        return sourceWorkId;
    }

    public Long getOfficerId() {
        return officerId;
    }

    public Long getAssignedByUserId() {
        return assignedByUserId;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = status;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public short getRequiredPhotos() {
        return requiredPhotos;
    }

    public void setRequiredPhotos(short requiredPhotos) {
        this.requiredPhotos = requiredPhotos;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void touchUpdatedAt() {
        this.updatedAt = Instant.now();
    }
}
