package com.mpladsentinel.inspection;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/assignments/{id}/sign-off/request}: an authority's
 * first sign-off, asking to complete or cancel an assignment. Does not change
 * the assignment's real status — see {@link ConfirmSignOffRequest}.
 */
public record RequestSignOffRequest(

        @NotNull AssignmentStatus targetStatus,

        @NotBlank @Size(max = 2000) String justification
) {
}
