package com.mpladsentinel.grievance;

/**
 * Review lifecycle of a {@link Grievance}. Authorities advance it forward;
 * names match {@code ck_grievance_status} (migration V6) and the frontend
 * {@code GrievanceStatus} union.
 */
public enum GrievanceStatus {
    SUBMITTED,
    UNDER_REVIEW,
    ACTIONED,
    CLOSED
}
