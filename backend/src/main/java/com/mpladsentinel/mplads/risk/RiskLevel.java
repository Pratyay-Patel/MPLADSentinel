package com.mpladsentinel.mplads.risk;

/**
 * Risk banding for a work. Mirrors the frontend {@code RiskLevel} union.
 *
 * <p>These are <strong>indicators requiring investigation</strong>, never proof
 * of wrongdoing (project rules §17). {@link #UNKNOWN} means "not enough data to
 * assess", which is distinct from {@link #LOW} ("assessed, nothing flagged").
 */
public enum RiskLevel {
    LOW,
    MEDIUM,
    HIGH,
    UNKNOWN;

    /** Score → band. Matches {@code rules.ts}: ≥55 HIGH, ≥25 MEDIUM, otherwise LOW. */
    static RiskLevel forScore(int score) {
        if (score >= 55) {
            return HIGH;
        }
        if (score >= 25) {
            return MEDIUM;
        }
        return LOW;
    }
}
