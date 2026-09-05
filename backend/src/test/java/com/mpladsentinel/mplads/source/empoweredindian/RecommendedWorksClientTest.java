package com.mpladsentinel.mplads.source.empoweredindian;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorkDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorksResponse;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.RecordedRequest;

class RecommendedWorksClientTest extends AbstractEmpoweredIndianClientTest {

    @Test
    void mapsAVerifiedRecommendedResponseAndItsPagination() throws InterruptedException {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("recommended-page1.json")));

        RecommendedWorksResponse response =
                defaultClient().fetchRecommendedWorks(ApiPageRequest.of(1, 20));

        // request was built from the verified contract
        RecordedRequest request = server.takeRequest();
        assertThat(request.getMethod()).isEqualTo("GET");
        assertThat(request.getPath()).isEqualTo("/api/works/recommended?page=1&limit=20");

        // pagination metadata
        assertThat(response.pagination().currentPage()).isEqualTo(1);
        assertThat(response.pagination().totalPages()).isEqualTo(4190);
        assertThat(response.pagination().totalCount()).isEqualTo(83_797L);
        assertThat(response.pagination().hasNext()).isTrue();
        assertThat(response.pagination().hasPrev()).isFalse();
        // lastUpdated is captured but is the response time, not data freshness
        assertThat(response.lastUpdated()).isNotNull();

        // records
        assertThat(response.recommendedWorks()).hasSize(2);
        RecommendedWorkDto first = response.recommendedWorks().get(0);
        assertThat(first.workId()).isEqualTo(260_540L);
        assertThat(first.house()).isEqualTo("Lok Sabha");
        assertThat(first.lsTerm()).isEqualTo(18);
        assertThat(first.workDescription()).startsWith("Extension of CC Road");
        assertThat(first.category()).isEqualTo("Normal/Others");
        assertThat(first.estimatedCost()).isEqualByComparingTo(new BigDecimal("2500000"));
        assertThat(first.recommendedDate()).isEqualTo(LocalDate.of(2026, 1, 20));
        assertThat(first.recommendedYear()).isEqualTo(2026);
        assertThat(first.status()).isEqualTo("Recommended");
        assertThat(first.district()).isEqualTo("ANDAMAN AND NICOBAR ISLANDS");
        assertThat(first.state()).isEqualTo("Andaman And Nicobar Islands");
        assertThat(first.mpDetails().name()).isEqualTo("BISHNU PADA RAY");
        assertThat(first.mpDetails().constituency()).isEqualTo("ANDAMAN AND NICOBAR ISLANDS");
        // 'party' is mis-populated by the source with the House name — captured verbatim
        assertThat(first.mpDetails().party()).isEqualTo("Lok Sabha");
        assertThat(first.hasPayments()).isTrue();
        assertThat(first.totalPaid()).isEqualByComparingTo(new BigDecimal("1350689"));
        assertThat(first.paymentCount()).isEqualTo(1);
    }

    @Test
    void handlesNullLsTermForRajyaSabhaRecords() {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("recommended-page1.json")));

        RecommendedWorksResponse response =
                defaultClient().fetchRecommendedWorks(ApiPageRequest.firstPage(20));

        RecommendedWorkDto rajyaSabha = response.recommendedWorks().get(1);
        assertThat(rajyaSabha.house()).isEqualTo("Rajya Sabha");
        assertThat(rajyaSabha.lsTerm()).isNull();
        assertThat(rajyaSabha.hasPayments()).isFalse();
        assertThat(rajyaSabha.totalPaid()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void treatsAnEmptyResultAsAZeroCountPageNotAnError() {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("recommended-empty.json")));

        RecommendedWorksResponse response =
                defaultClient().fetchRecommendedWorks(ApiPageRequest.of(1, 20));

        assertThat(response.recommendedWorks()).isEmpty();
        assertThat(response.pagination().totalCount()).isZero();
        assertThat(response.pagination().hasNext()).isFalse();
    }

    @Test
    void requestsTheSpecificPageAsked() throws InterruptedException {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("recommended-empty.json")));

        defaultClient().fetchRecommendedWorks(ApiPageRequest.of(7, 50));

        assertThat(server.takeRequest().getPath())
                .isEqualTo("/api/works/recommended?page=7&limit=50");
    }

    @Test
    void addsTheStateFilterToTheQueryWhenSet() throws InterruptedException {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("recommended-empty.json")));

        defaultClient().fetchRecommendedWorks(ApiPageRequest.of(1, 100, "Tamil Nadu"));

        RecordedRequest request = server.takeRequest();
        assertThat(request.getRequestUrl().queryParameter("state")).isEqualTo("Tamil Nadu");
        assertThat(request.getRequestUrl().queryParameter("page")).isEqualTo("1");
        assertThat(request.getRequestUrl().queryParameter("limit")).isEqualTo("100");
    }
}
