package com.mpladsentinel.mplads.source.empoweredindian;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ApiPageRequestTest {

    @Test
    void acceptsValuesWithinTheVerifiedContractBounds() {
        assertThat(ApiPageRequest.of(1, 1)).isEqualTo(new ApiPageRequest(1, 1, null));
        assertThat(ApiPageRequest.of(4190, 100)).isEqualTo(new ApiPageRequest(4190, 100, null));
        assertThat(ApiPageRequest.firstPage(20)).isEqualTo(new ApiPageRequest(1, 20, null));
    }

    @Test
    void rejectsPageBelowOne() {
        assertThatThrownBy(() -> ApiPageRequest.of(0, 20))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("page");
    }

    @Test
    void rejectsLimitOutsideOneToHundred() {
        assertThatThrownBy(() -> ApiPageRequest.of(1, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("limit");
        assertThatThrownBy(() -> ApiPageRequest.of(1, 101))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("limit");
    }

    @Test
    void carriesAnOptionalStateFilter() {
        ApiPageRequest withState = ApiPageRequest.of(1, 100, "Kerala");
        assertThat(withState.hasState()).isTrue();
        assertThat(withState.state()).isEqualTo("Kerala");
    }

    @Test
    void normalisesNullOrBlankStateToNoFilter() {
        assertThat(ApiPageRequest.of(1, 100, null).hasState()).isFalse();
        assertThat(ApiPageRequest.of(1, 100, "   ").hasState()).isFalse();
        assertThat(ApiPageRequest.of(1, 100, "   ").state()).isNull();
    }
}
