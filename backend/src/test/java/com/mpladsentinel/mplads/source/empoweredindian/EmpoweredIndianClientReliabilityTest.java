package com.mpladsentinel.mplads.source.empoweredindian;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorksResponse;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianApiException;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianResponseException;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianTransportException;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.SocketPolicy;

class EmpoweredIndianClientReliabilityTest extends AbstractEmpoweredIndianClientTest {

    private MockResponse ok() {
        return new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("recommended-empty.json"));
    }

    private MockResponse status(int code, String fixtureName) {
        return new MockResponse()
                .setResponseCode(code)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture(fixtureName));
    }

    // --- timeouts / transport --------------------------------------------

    @Test
    void aResponseSlowerThanTheReadTimeoutIsATransportFailure() {
        server.enqueue(ok().setHeadersDelay(1, TimeUnit.SECONDS));

        EmpoweredIndianClient client = clientWith(properties(
                Duration.ofSeconds(2), Duration.ofMillis(200), 1, Duration.ofMillis(1)));

        assertThatThrownBy(() -> client.fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianTransportException.class);
    }

    @Test
    void aDroppedConnectionIsATransportFailure() {
        server.enqueue(new MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START));

        EmpoweredIndianClient client = clientWith(properties(
                Duration.ofSeconds(2), Duration.ofSeconds(2), 1, Duration.ofMillis(1)));

        assertThatThrownBy(() -> client.fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianTransportException.class);
    }

    // --- non-2xx --------------------------------------------------------

    @Test
    void a400ValidationErrorSurfacesWithStatusAndBody() {
        server.enqueue(status(400, "error-400-validation.json"));

        EmpoweredIndianClient client = clientWith(properties(
                Duration.ofSeconds(2), Duration.ofSeconds(2), 3, Duration.ofMillis(1)));

        assertThatThrownBy(() -> client.fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianApiException.class)
                .satisfies(ex -> {
                    EmpoweredIndianApiException api = (EmpoweredIndianApiException) ex;
                    assertThat(api.statusCode()).isEqualTo(400);
                    assertThat(api.responseBodySnippet()).contains("Validation Error");
                });

        // 4xx is not retried
        assertThat(server.getRequestCount()).isEqualTo(1);
    }

    // --- malformed 2xx -------------------------------------------------

    @Test
    void nonJsonBodyIsAResponseException() {
        server.enqueue(new MockResponse().setResponseCode(200)
                .setHeader("Content-Type", "application/json").setBody("<html>not json</html>"));

        assertThatThrownBy(() -> defaultClient().fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianResponseException.class);
    }

    @Test
    void successFalseBodyIsAResponseException() {
        server.enqueue(new MockResponse().setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"success\":false,\"error\":\"nope\"}"));

        assertThatThrownBy(() -> defaultClient().fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianResponseException.class);
    }

    @Test
    void missingDataObjectIsAResponseException() {
        server.enqueue(new MockResponse().setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"success\":true}"));

        assertThatThrownBy(() -> defaultClient().fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianResponseException.class);
    }

    // --- bounded retry -----------------------------------------------

    @Test
    void retriesTransient5xxUpToMaxAttemptsThenSucceeds() {
        server.enqueue(new MockResponse().setResponseCode(503));
        server.enqueue(new MockResponse().setResponseCode(503));
        server.enqueue(ok());

        EmpoweredIndianClient client = clientWith(properties(
                Duration.ofSeconds(2), Duration.ofSeconds(2), 3, Duration.ofMillis(1)));

        RecommendedWorksResponse response = client.fetchRecommendedWorks(ApiPageRequest.of(1, 20));

        assertThat(response.recommendedWorks()).isEmpty();
        assertThat(server.getRequestCount()).isEqualTo(3);
    }

    @Test
    void stopsAfterMaxAttemptsWhen5xxPersists() {
        server.enqueue(new MockResponse().setResponseCode(503));
        server.enqueue(new MockResponse().setResponseCode(503));
        server.enqueue(new MockResponse().setResponseCode(503));

        EmpoweredIndianClient client = clientWith(properties(
                Duration.ofSeconds(2), Duration.ofSeconds(2), 3, Duration.ofMillis(1)));

        assertThatThrownBy(() -> client.fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianApiException.class)
                .satisfies(ex -> assertThat(((EmpoweredIndianApiException) ex).statusCode()).isEqualTo(503));

        assertThat(server.getRequestCount()).isEqualTo(3);
    }

    @Test
    void retriesA429() {
        server.enqueue(new MockResponse().setResponseCode(429));
        server.enqueue(ok());

        EmpoweredIndianClient client = clientWith(properties(
                Duration.ofSeconds(2), Duration.ofSeconds(2), 3, Duration.ofMillis(1)));

        client.fetchRecommendedWorks(ApiPageRequest.of(1, 20));

        assertThat(server.getRequestCount()).isEqualTo(2);
    }

    @Test
    void doesNotRetryWhenMaxAttemptsIsOne() {
        server.enqueue(new MockResponse().setResponseCode(503));

        EmpoweredIndianClient client = clientWith(properties(
                Duration.ofSeconds(2), Duration.ofSeconds(2), 1, Duration.ofMillis(1)));

        assertThatThrownBy(() -> client.fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianApiException.class);

        assertThat(server.getRequestCount()).isEqualTo(1);
    }

    @Test
    void doesNotRetryAMalformedBody() {
        server.enqueue(new MockResponse().setResponseCode(200)
                .setHeader("Content-Type", "application/json").setBody("{\"success\":true}"));

        EmpoweredIndianClient client = clientWith(properties(
                Duration.ofSeconds(2), Duration.ofSeconds(2), 3, Duration.ofMillis(1)));

        assertThatThrownBy(() -> client.fetchRecommendedWorks(ApiPageRequest.of(1, 20)))
                .isInstanceOf(EmpoweredIndianResponseException.class);

        assertThat(server.getRequestCount()).isEqualTo(1);
    }
}
