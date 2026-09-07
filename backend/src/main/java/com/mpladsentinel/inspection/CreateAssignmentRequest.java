package com.mpladsentinel.inspection;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/assignments} — an authority requests an inspection of
 * a work by a field officer. Mirrors the frontend {@code AssignmentInput}.
 */
public record CreateAssignmentRequest(

        /** The work to inspect (a source work id). Must resolve to an ingested work. */
        @NotNull Long sourceWorkId,

        /** Field officer to assign, e.g. {@code OFF102}. */
        @NotBlank @Size(max = 16) String officerCode,

        /** Optional target date for the inspection. */
        LocalDate dueDate,

        /** Optional instruction shown to the officer. */
        @Size(max = 2000) String note
) {
}
