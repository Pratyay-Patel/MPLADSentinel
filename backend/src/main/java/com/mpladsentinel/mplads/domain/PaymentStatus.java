package com.mpladsentinel.mplads.domain;

/**
 * Normalised status of an individual payment installment. Stored in
 * {@code work_payment.status}; a {@code null} column value means "not yet
 * normalised / unknown" and is distinct from {@link #UNKNOWN}. Names match the
 * {@code ck_work_payment_status} check constraint.
 *
 * <p>Only {@code "Payment Success"} has been observed from the source so far
 * (see {@code docs/data-source.md} 13.4).
 */
public enum PaymentStatus {
    SUCCESS,
    PENDING,
    UNKNOWN
}
