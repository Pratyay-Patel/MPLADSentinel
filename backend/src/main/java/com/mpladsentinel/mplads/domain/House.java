package com.mpladsentinel.mplads.domain;

/**
 * House of Parliament for a work. Present only on records from the recommended
 * endpoint; {@code null} for completed-only works. Names match the
 * {@code ck_work_house} check constraint.
 */
public enum House {
    LOK_SABHA,
    RAJYA_SABHA
}
