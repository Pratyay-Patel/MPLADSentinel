package com.mpladsentinel.grievance;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/grievances}. Mirrors the frontend {@code GrievanceInput}.
 * Validation matches the client-side checks (§P1.5): category / subject required,
 * description at least 20 characters, a valid email if one is given.
 */
public record CreateGrievanceRequest(

        /** A source work id, or {@code null} for a general grievance. */
        Long workReference,

        @NotBlank String category,

        @NotBlank @Size(max = 200) String subject,

        @NotBlank @Size(min = 20, max = 5000) String description,

        @Size(max = 128) String contactName,

        @Email @Size(max = 256) String contactEmail
) {
}
