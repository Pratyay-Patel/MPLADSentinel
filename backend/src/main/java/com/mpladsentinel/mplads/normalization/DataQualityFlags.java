package com.mpladsentinel.mplads.normalization;

/**
 * Descriptive markers written to {@code work.data_quality_flags} and accumulated
 * for {@code work_payment} rows.
 *
 * <p>They record observed conditions in the <strong>secondary</strong> Empowered
 * Indian source data (documented in docs/data-source.md &sect;13.8). They are
 * <strong>not</strong> risk findings and carry no fraud meaning &mdash; risk
 * scoring is a later phase. An ordinary, legitimate {@code null} (e.g. a Rajya
 * Sabha record's {@code lsTerm}, or a completed record's absent {@code house}) is
 * never flagged.
 *
 * <p>Values equal their constant names so they stay greppable in the database.
 */
public final class DataQualityFlags {

    /**
     * At least one {@code *_hi} field was byte-for-byte equal to its English
     * counterpart. Every Hindi field in the source is a placeholder copy of the
     * English value (&sect;13.8); the real value, if any, is unknown.
     */
    public static final String HI_FIELDS_MIRROR_EN = "HI_FIELDS_MIRROR_EN";

    /**
     * {@code mp_details.party} was present. The source populates it with the
     * House name (e.g. "Lok Sabha"), not a political party (&sect;13.8), so the
     * value is not mapped into the domain model.
     */
    public static final String MP_PARTY_FIELD_IS_HOUSE_NOT_PARTY = "MP_PARTY_FIELD_IS_HOUSE_NOT_PARTY";

    /**
     * {@code expected_beneficiaries} / {@code beneficiaries} was {@code 0}. This
     * field reads {@code 0} in ~100% of sampled records and is effectively
     * unpopulated (&sect;13.8); {@code 0} must not be read as a real measurement.
     */
    public static final String BENEFICIARIES_FIELD_UNPOPULATED = "BENEFICIARIES_FIELD_UNPOPULATED";

    /**
     * {@code work_description} was absent/blank even though the source normally
     * always provides it (&sect;13.2, &sect;13.3) &mdash; a source anomaly, not an
     * ordinary null.
     */
    public static final String MISSING_WORK_DESCRIPTION = "MISSING_WORK_DESCRIPTION";

    /**
     * {@code work_description} was present but carries no readable content
     * (fewer than 3 letters after trimming) &mdash; typically source encoding
     * loss where non-Latin script became {@code ?} (e.g. {@code "?? ?? ??"}), or
     * bare punctuation. The verbatim value is kept in {@code work.work_description}
     * (and the raw JSON in {@code raw_source_record}); callers should present a
     * {@code "Work #<id>"} placeholder and list these works last.
     */
    public static final String UNREADABLE_WORK_DESCRIPTION = "UNREADABLE_WORK_DESCRIPTION";

    /**
     * The {@code mp_details} object was absent even though the source provides it
     * in 100/100 sampled records.
     */
    public static final String MP_DETAILS_ABSENT = "MP_DETAILS_ABSENT";

    /**
     * {@code house} held a value that is neither "Lok Sabha" nor "Rajya Sabha".
     * The domain {@code house} is stored as {@code null}; the raw value survives
     * in the raw-source record.
     */
    public static final String UNMAPPED_HOUSE_VALUE = "UNMAPPED_HOUSE_VALUE";

    /**
     * A monetary value carried more fractional precision than the
     * {@code NUMERIC(15,2)} column keeps. The value stored is scaled to two
     * decimals; the exact source value survives in the raw-source record.
     */
    public static final String COST_PRECISION_EXCEEDS_DB_SCALE = "COST_PRECISION_EXCEEDS_DB_SCALE";

    /**
     * The source {@code status} string was longer than
     * {@code work.source_status_raw} ({@code VARCHAR(64)}) and was truncated.
     */
    public static final String STATUS_VALUE_TRUNCATED = "STATUS_VALUE_TRUNCATED";

    /**
     * A successful payments response carried no {@code summary} object; the
     * installment count was derived from the {@code allPayments[]} row list and
     * the monetary roll-ups were left {@code null}.
     */
    public static final String PAYMENT_SUMMARY_ABSENT = "PAYMENT_SUMMARY_ABSENT";

    /**
     * {@code summary.totalInstallments} disagreed with the number of
     * {@code allPayments[]} rows actually returned.
     */
    public static final String PAYMENT_INSTALLMENT_COUNT_MISMATCH = "PAYMENT_INSTALLMENT_COUNT_MISMATCH";

    /**
     * {@code summary.totalAmountPaid} disagreed with the sum of
     * {@code allPayments[].amount}.
     */
    public static final String PAYMENT_SUMMARY_TOTAL_MISMATCHES_ROWS = "PAYMENT_SUMMARY_TOTAL_MISMATCHES_ROWS";

    /**
     * A payments response mapped to {@code FETCHED_PRESENT} yet its
     * {@code allPayments[]} array was empty &mdash; &sect;13.4 says a 200 payments
     * response means rows exist. Kept distinct from {@code FETCHED_ABSENT} (the
     * 404 case).
     */
    public static final String PAYMENT_STATE_PRESENT_BUT_NO_ROWS = "PAYMENT_STATE_PRESENT_BUT_NO_ROWS";

    /**
     * An installment had {@code amount == 0}. Preserved verbatim as a real zero
     * payment row, never dropped and never conflated with "no payment data".
     */
    public static final String ZERO_VALUE_PAYMENT_INSTALLMENT = "ZERO_VALUE_PAYMENT_INSTALLMENT";

    private DataQualityFlags() {
    }
}
