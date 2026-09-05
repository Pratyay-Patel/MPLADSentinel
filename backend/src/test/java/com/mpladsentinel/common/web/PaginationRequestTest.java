package com.mpladsentinel.common.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

class PaginationRequestTest {

    @Test
    void createsOneBasedPaginationWithinTheSupportedLimit() {
        assertThat(PaginationRequest.of(2, 50)).isEqualTo(new PaginationRequest(2, 50));
    }

    @Test
    void rejectsInvalidPageAndSize() {
        assertThatThrownBy(() -> PaginationRequest.of(0, 20))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PaginationRequest.of(1, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PaginationRequest.of(1, 101))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void slicesRowsAndReportsMetadata() {
        PageResponse<Integer> page = PageResponse.of(List.of(1, 2, 3), 2, 2);

        assertThat(page.content()).containsExactly(3);
        assertThat(page.page()).isEqualTo(2);
        assertThat(page.size()).isEqualTo(2);
        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.totalPages()).isEqualTo(2);
    }

    @Test
    void returnsAnEmptyContentPageWhenThePageIsPastTheEnd() {
        PageResponse<Integer> page = PageResponse.of(List.of(1, 2, 3), Integer.MAX_VALUE, 2);

        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.totalPages()).isEqualTo(2);
    }
}
