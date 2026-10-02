package com.mpladsentinel.inspection;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/assignments/{id}/sign-off/confirm}: a second,
 * different authority's sign-off, finalising the pending status change.
 */
public record ConfirmSignOffRequest(

        @NotBlank @Size(max = 2000) String justification
) {
}
