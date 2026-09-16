package com.mpladsentinel.recommendation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/recommendations}. Mirrors the frontend
 * {@code WorkRecommendationInput}. No fund-estimate field — a citizen cannot
 * reasonably be expected to price a work themselves. Locality is a GPS
 * coordinates / maps link rather than free text, harder to fake than a
 * written description.
 */
public record CreateWorkRecommendationRequest(

        @NotBlank @Size(max = 128) String fullName,

        @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter a valid 10-digit mobile number")
        String mobileNumber,

        @Email @Size(max = 256) String email,

        @NotBlank @Size(max = 64) String state,

        @NotBlank @Size(max = 128) String mpName,

        @NotBlank @Size(max = 128) String constituency,

        @NotNull LocationCategory locationCategory,

        @NotBlank @Size(max = 500) String gpsCoordinatesLink,

        @NotBlank @Size(max = 200) String workTitle,

        @NotBlank String category,

        @NotBlank @Size(min = 20, max = 5000) String description
) {
}
