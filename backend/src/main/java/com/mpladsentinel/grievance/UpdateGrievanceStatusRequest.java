package com.mpladsentinel.grievance;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code PATCH /api/grievances/{id}}. Mirrors the frontend
 * {@code GrievanceStatusPatch}. The frontend always sends the current
 * {@code actionNote} alongside the status, so both fields are applied.
 */
public record UpdateGrievanceStatusRequest(

        @NotNull GrievanceStatus status,

        @Size(max = 5000) String actionNote
) {
}
