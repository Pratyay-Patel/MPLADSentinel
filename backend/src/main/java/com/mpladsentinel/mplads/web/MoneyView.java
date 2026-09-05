package com.mpladsentinel.mplads.web;

import java.math.BigDecimal;

/**
 * A monetary amount with its currency, as sent to the frontend. {@code null} as
 * a whole when the underlying amount is absent — "no amount recorded" is never
 * rendered as {@code 0}.
 */
public record MoneyView(BigDecimal amount, String currency) {

    static MoneyView of(BigDecimal amount, String currency) {
        if (amount == null) {
            return null;
        }
        return new MoneyView(amount, currency == null ? "INR" : currency);
    }
}
