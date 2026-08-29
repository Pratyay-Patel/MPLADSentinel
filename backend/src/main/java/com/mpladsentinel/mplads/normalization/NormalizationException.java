package com.mpladsentinel.mplads.normalization;

/**
 * A source record cannot be normalised into the internal model &mdash; for
 * example its mandatory numeric work identifier is missing or non-positive, or a
 * whole-number field is outside the range the schema stores.
 *
 * <p>Normalisation itself neither logs nor persists. The future ingestion phase
 * is expected to catch this and route the offending payload to
 * {@code ingestion_dead_letter} so a run can continue past bad input.
 */
public class NormalizationException extends RuntimeException {

    public NormalizationException(String message) {
        super(message);
    }
}
