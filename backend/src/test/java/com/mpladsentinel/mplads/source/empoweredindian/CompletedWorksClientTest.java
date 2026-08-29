package com.mpladsentinel.mplads.source.empoweredindian;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.mpladsentinel.mplads.source.empoweredindian.dto.CompletedWorkDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.CompletedWorksResponse;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.RecordedRequest;

class CompletedWorksClientTest extends AbstractEmpoweredIndianClientTest {

    @Test
    void mapsAVerifiedCompletedResponseUsingItsOwnFieldNames() throws InterruptedException {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("completed-page1.json")));

        CompletedWorksResponse response =
                defaultClient().fetchCompletedWorks(ApiPageRequest.of(1, 20));

        RecordedRequest request = server.takeRequest();
        assertThat(request.getPath()).isEqualTo("/api/works/completed?page=1&limit=20");

        assertThat(response.pagination().totalCount()).isEqualTo(43_667L);
        assertThat(response.completedWorks()).hasSize(2);

        CompletedWorkDto first = response.completedWorks().get(0);
        // 'work_id' on completed, not 'workId' — mapped onto the same accessor
        assertThat(first.workId()).isEqualTo(134_703L);
        // 'cost' on completed, not 'estimated_cost'
        assertThat(first.cost()).isEqualByComparingTo(new BigDecimal("499993"));
        assertThat(first.completionDate()).isEqualTo(LocalDate.of(2025, 1, 31));
        assertThat(first.completionYear()).isEqualTo(2025);
        // 'beneficiaries' on completed, not 'expected_beneficiaries'
        assertThat(first.beneficiaries()).isZero();
        assertThat(first.district()).isEqualTo("CHITTOOR");
        assertThat(first.state()).isEqualTo("Andhra Pradesh");
        assertThat(first.mpDetails().name()).isEqualTo("A SAMPLE MEMBER");
    }

    @Test
    void keepsNonIntegerCostsExactlyViaBigDecimal() {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("completed-page1.json")));

        CompletedWorksResponse response =
                defaultClient().fetchCompletedWorks(ApiPageRequest.of(1, 20));

        assertThat(response.completedWorks().get(1).cost())
                .isEqualByComparingTo(new BigDecimal("545766.98"));
    }

    @Test
    void addsTheStateFilterToTheQueryWhenSet() throws InterruptedException {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("completed-page1.json")));

        defaultClient().fetchCompletedWorks(ApiPageRequest.of(2, 100, "West Bengal"));

        RecordedRequest request = server.takeRequest();
        assertThat(request.getRequestUrl().queryParameter("state")).isEqualTo("West Bengal");
        assertThat(request.getRequestUrl().queryParameter("page")).isEqualTo("2");
    }

    @Test
    void completedRecordsDoNotCarryRecommendedOnlyFields() {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("completed-page1.json")));

        CompletedWorkDto first = defaultClient()
                .fetchCompletedWorks(ApiPageRequest.of(1, 20))
                .completedWorks()
                .get(0);

        // The CompletedWorkDto type has no house / lsTerm / status / hasPayments
        // accessors at all — the completed endpoint omits them (§13.3). This test
        // documents that the mapping still succeeds without them.
        assertThat(first.workDescription()).isNotBlank();
        assertThat(first.cost()).isNotNull();
    }
}
