package com.mpladsentinel.mplads.domain;

/**
 * Whether payment information for a work has been retrieved, and the outcome.
 *
 * <p>This is the field that keeps "no expenditure known" separate from
 * "&#8377;0 spent". Names match the {@code ck_work_payment_data_state} check
 * constraint.
 */
public enum PaymentDataState {

    /** The payments endpoint has not been queried for this work. */
    NOT_FETCHED,

    /** The payments endpoint returned payment rows. */
    FETCHED_PRESENT,

    /**
     * The payments endpoint returned HTTP 404 "No payment records found".
     * The same response is returned for a work that does not exist, so this
     * means "no payment rows found", <strong>not</strong> "&#8377;0 spent".
     */
    FETCHED_ABSENT,

    /** The payments fetch failed (5xx / timeout / rate-limit exhausted). */
    FETCH_ERROR
}
