package com.mpladsentinel.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/auth/register} (decision D32). Self-registration is
 * for citizens only — there is deliberately <strong>no</strong> {@code role}
 * field; the server always assigns {@link WebRole#CITIZEN}.
 */
public record RegisterRequest(

        @NotBlank @Size(max = 128) String displayName,

        @NotBlank @Email @Size(max = 256) String email,

        @NotBlank @Size(min = 8, max = 128) String password,

        @NotBlank String passwordConfirm
) {
}
