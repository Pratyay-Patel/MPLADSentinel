package com.mpladsentinel.mplads.source.empoweredindian.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

class FlexibleLocalDateDeserializerTest {

    private record Holder(
            @JsonProperty("d")
            @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
            LocalDate d) {
    }

    private final ObjectMapper mapper = new ObjectMapper();

    private LocalDate parse(String json) throws Exception {
        return mapper.readValue(json, Holder.class).d();
    }

    @Test
    void parsesIso8601InstantWithZeroTime() throws Exception {
        assertThat(parse("{\"d\":\"2026-01-20T00:00:00.000Z\"}")).isEqualTo(LocalDate.of(2026, 1, 20));
    }

    @Test
    void parsesPlainYearMonthDay() throws Exception {
        assertThat(parse("{\"d\":\"2026-08-05\"}")).isEqualTo(LocalDate.of(2026, 8, 5));
    }

    @Test
    void mapsNullAndBlankToNull() throws Exception {
        assertThat(parse("{\"d\":null}")).isNull();
        assertThat(parse("{\"d\":\"\"}")).isNull();
        assertThat(parse("{\"d\":\"   \"}")).isNull();
    }

    @Test
    void rejectsAnUnparseableValue() {
        assertThatThrownBy(() -> parse("{\"d\":\"not-a-date\"}"))
                .isInstanceOf(JsonMappingException.class);
    }
}
