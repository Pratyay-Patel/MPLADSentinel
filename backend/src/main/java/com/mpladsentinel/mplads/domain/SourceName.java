package com.mpladsentinel.mplads.domain;

/**
 * Known values for the {@code source_name} column.
 *
 * <p>Kept as string constants rather than an enum so additional sources can be
 * introduced without a code change. There is currently one source:
 * <strong>Empowered Indian</strong>, which is a <em>secondary</em> data-access
 * source and must never be represented as the authoritative MPLADS system.
 */
public final class SourceName {

    /** Empowered Indian API &mdash; secondary data-access source. */
    public static final String EMPOWERED_INDIAN = "EMPOWERED_INDIAN";

    private SourceName() {
    }
}
