package com.mpladsentinel.escrow;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/fund-requests}. District Officer only. */
public record CreateFundRequestRequest(

        @NotNull Long sourceWorkId,

        @NotNull @DecimalMin(value = "0.01", message = "requestedAmount must be greater than zero")
        BigDecimal requestedAmount,

        @Size(max = 2000) String remarks
) {
}
