package com.mpladsentinel.mplads.normalization;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.util.regex.Pattern;

import com.mpladsentinel.mplads.domain.House;

/**
 * Stateless helpers shared by the normalizers. Deterministic and side-effect
 * free: no HTTP, no persistence, no clock reads, no randomness.
 */
final class NormalizationSupport {

    /** Fractional scale of the {@code NUMERIC(15,2)} money columns in V3 / V4. */
    static final int MONEY_SCALE = 2;

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private NormalizationSupport() {
    }

    /** Strip surrounding whitespace; return {@code null} if nothing remains. Content is otherwise verbatim. */
    static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Upper-cased, internally-whitespace-collapsed form for the
     * {@code *_normalized} match columns (state / district / constituency / MP /
     * vendor / category). {@code null} for null/blank input. Does not
     * transliterate, expand abbreviations or spell-correct &mdash; it only makes
     * casing and spacing consistent for later matching (&sect;13.11).
     */
    static String toMatchForm(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        return WHITESPACE.matcher(trimmed).replaceAll(" ").toUpperCase(Locale.ROOT);
    }

    /** {@code true} when both sides are non-null and equal &mdash; the {@code *_hi} placeholder case (&sect;13.8). */
    static boolean mirrors(String english, String hindi) {
        return english != null && english.equals(hindi);
    }

    /**
     * Map the source {@code house} string to {@link House}. Returns {@code null}
     * both for a null/blank input (ordinary &mdash; completed records carry no
     * house) and for an unrecognised value; the caller decides whether the latter
     * warrants a flag.
     */
    static House parseHouse(String value) {
        String v = trimToNull(value);
        if (v == null) {
            return null;
        }
        return switch (v.toUpperCase(Locale.ROOT)) {
            case "LOK SABHA", "LOK_SABHA" -> House.LOK_SABHA;
            case "RAJYA SABHA", "RAJYA_SABHA" -> House.RAJYA_SABHA;
            default -> null;
        };
    }

    /** Scale a monetary value to the DB scale (half-up). {@code null} for {@code null}. */
    static BigDecimal toMoney(BigDecimal value) {
        return value == null ? null : value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /** {@code true} when {@code value} carries more fractional precision than the money column keeps. */
    static boolean exceedsMoneyScale(BigDecimal value) {
        return value != null && value.stripTrailingZeros().scale() > MONEY_SCALE;
    }

    /** Canonical two-decimal plain string used inside the payment fingerprint. */
    static String moneyToken(BigDecimal value) {
        return value == null ? "" : toMoney(value).toPlainString();
    }

    /** {@code Integer} &rarr; {@code Short} with a range guard. {@code null} for {@code null}. */
    static Short toShort(Integer value, String field) {
        if (value == null) {
            return null;
        }
        if (value < Short.MIN_VALUE || value > Short.MAX_VALUE) {
            throw new NormalizationException(field + " is outside SMALLINT range: " + value);
        }
        return value.shortValue();
    }

    /** Lower-case hex SHA-256 of the UTF-8 bytes of {@code input} (64 chars). */
    static String sha256Hex(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /** {@code value} trimmed, or {@code ""} &mdash; for building delimiter-joined fingerprint input. */
    static String token(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? "" : trimmed;
    }
}
