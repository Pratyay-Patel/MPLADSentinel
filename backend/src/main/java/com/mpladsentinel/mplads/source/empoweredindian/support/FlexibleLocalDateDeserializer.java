package com.mpladsentinel.mplads.source.empoweredindian.support;

import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

/**
 * Parses Empowered Indian date values to {@link LocalDate}.
 *
 * <p>The source uses day precision but expresses it inconsistently
 * (docs/data-source.md &sect;13.8): work dates and {@code allPayments[].date} are
 * ISO-8601 instants with a zero time component ({@code "2026-01-20T00:00:00.000Z"}),
 * while {@code paymentTimeline[].date} is a plain {@code "yyyy-MM-dd"}. Both are
 * accepted; any time-of-day / zone component (always {@code 00:00:00.000Z} in
 * observed data) is discarded.
 *
 * <p>{@code null} and blank map to {@code null}. An unrecognised non-blank value
 * raises a Jackson mapping error rather than being silently dropped.
 */
public class FlexibleLocalDateDeserializer extends JsonDeserializer<LocalDate> {

    @Override
    public LocalDate deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        String raw = parser.getValueAsString();
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.strip();
        try {
            if (value.length() == 10) {
                return LocalDate.parse(value);
            }
            return OffsetDateTime.parse(value).toLocalDate();
        } catch (DateTimeParseException e) {
            throw context.weirdStringException(value, LocalDate.class,
                    "expected 'yyyy-MM-dd' or an ISO-8601 date-time");
        }
    }
}
