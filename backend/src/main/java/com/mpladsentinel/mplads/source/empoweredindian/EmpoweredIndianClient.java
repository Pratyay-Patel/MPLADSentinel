package com.mpladsentinel.mplads.source.empoweredindian;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpladsentinel.mplads.source.empoweredindian.dto.CompletedWorksResponse;
import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorksResponse;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsResponse;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianApiException;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianClientException;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianResponseException;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianTransportException;

/**
 * Transport-layer client for the Empowered Indian MPLADS API
 * (docs/data-source.md &sect;13). Responsible for HTTP calls, request
 * construction, response deserialisation into API DTOs, pagination metadata, and
 * transport/HTTP error handling. It does <strong>not</strong> normalise, persist,
 * or orchestrate ingestion.
 *
 * <p>Constructed by {@link EmpoweredIndianClientConfig} with a {@link RestClient}
 * pre-configured with the base URL and connect/read timeouts. This class is
 * deliberately framework-free so it can be unit-tested against a local mock HTTP
 * server without a Spring context.
 *
 * <h2>Reliability</h2>
 * <ul>
 *   <li>Connect and read timeouts are enforced by the underlying request factory.</li>
 *   <li>Each call is attempted at most {@code maxAttempts} times
 *       ({@code >= 1}); retries happen only for transport failures, HTTP 429 and
 *       HTTP 5xx, with a fixed {@code retryDelay} between attempts. There is no
 *       exponential growth and no unbounded retry.</li>
 *   <li>4xx (other than 429) and malformed 2xx bodies fail immediately.</li>
 *   <li>Response bodies are read with a hard {@value #MAX_RESPONSE_BYTES}-byte
 *       ceiling; {@code limit <= 100} keeps a real page well under it.</li>
 * </ul>
 */
public class EmpoweredIndianClient {

    /** Absolute upper bound on a response body the client will buffer. */
    static final int MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

    private static final Logger log = LoggerFactory.getLogger(EmpoweredIndianClient.class);

    private static final String RECOMMENDED_PATH = "/works/recommended";
    private static final String COMPLETED_PATH = "/works/completed";
    private static final String PAYMENTS_PATH = "/works/{workId}/payments";

    private final RestClient restClient;
    private final EmpoweredIndianClientProperties properties;
    private final ObjectMapper objectMapper;

    public EmpoweredIndianClient(RestClient restClient,
                                 EmpoweredIndianClientProperties properties,
                                 ObjectMapper objectMapper) {
        this.restClient = Objects.requireNonNull(restClient, "restClient");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
    }

    /** The configured default {@code limit} for callers that do not choose one. */
    public int defaultPageSize() {
        return properties.defaultPageSize();
    }

    /**
     * Fetch one page of {@code GET /api/works/recommended}.
     *
     * @param page 1-based page and page size (1..100)
     * @return the page of recommended works plus pagination metadata
     * @throws EmpoweredIndianApiException       on a non-2xx response
     * @throws EmpoweredIndianResponseException  on a 2xx response that does not match the contract
     * @throws EmpoweredIndianTransportException on connect/read timeout or other transport failure
     */
    public RecommendedWorksResponse fetchRecommendedWorks(ApiPageRequest page) {
        Objects.requireNonNull(page, "page");
        return withRetry("recommended works",
                () -> exchangeForData(RECOMMENDED_PATH, page, RecommendedWorksResponse.class));
    }

    /**
     * Fetch one page of {@code GET /api/works/completed}.
     *
     * <p>Field names on completed records differ from recommended
     * (docs/data-source.md &sect;13.3); the DTOs handle that mapping.
     *
     * @param page 1-based page and page size (1..100)
     * @return the page of completed works plus pagination metadata
     */
    public CompletedWorksResponse fetchCompletedWorks(ApiPageRequest page) {
        Objects.requireNonNull(page, "page");
        return withRetry("completed works",
                () -> exchangeForData(COMPLETED_PATH, page, CompletedWorksResponse.class));
    }

    /**
     * Fetch payment installments for one work
     * ({@code GET /api/works/{workId}/payments}).
     *
     * @param workId numeric work id (shared id space across recommended/completed/payments)
     * @return the payments payload if payment rows exist;
     *         {@link Optional#empty()} if the API returned HTTP 404 with body
     *         {@code {"success":false,"message":"No payment records found for this work"}}.
     *         <p>Per docs/data-source.md &sect;13.4 that 404 means <em>"no payment
     *         rows were found; the work may or may not exist"</em>. It is
     *         <strong>not</strong> zero expenditure and <strong>not</strong> an
     *         error. The caller (ingestion phase) must keep "no payment info"
     *         distinct from "&#8377;0 paid".
     * @throws EmpoweredIndianApiException       on any other non-2xx response
     *                                           (including an unexpected 404 body,
     *                                           and the HTTP 500 cast error for a
     *                                           non-numeric id)
     * @throws EmpoweredIndianResponseException  on a malformed 2xx response
     * @throws EmpoweredIndianTransportException on transport failure
     */
    public Optional<WorkPaymentsResponse> fetchWorkPayments(long workId) {
        if (workId <= 0) {
            throw new IllegalArgumentException("workId must be positive, got " + workId);
        }
        return withRetry("work payments", () -> exchangeForPayments(workId));
    }

    // ------------------------------------------------------------------
    // HTTP exchange
    // ------------------------------------------------------------------

    private <T> T exchangeForData(String path, ApiPageRequest page, Class<T> dataType) {
        return restClient.get()
                .uri(builder -> {
                    builder.path(path)
                            .queryParam("page", page.page())
                            .queryParam("limit", page.limit());
                    if (page.hasState()) {
                        // VERIFIED filter (docs/data-source.md §13.2/§13.3): exact match on `state`.
                        builder.queryParam("state", page.state());
                    }
                    return builder.build();
                })
                .accept(MediaType.APPLICATION_JSON)
                .exchange((request, response) -> {
                    HttpStatusCode status = response.getStatusCode();
                    String body = readBody(response);
                    if (status.isError()) {
                        throw new EmpoweredIndianApiException(status.value(), snippet(body),
                                "Empowered Indian GET " + path + " failed");
                    }
                    return parseEnvelopeData(body, dataType, path);
                });
    }

    private Optional<WorkPaymentsResponse> exchangeForPayments(long workId) {
        return restClient.get()
                .uri(builder -> builder.path(PAYMENTS_PATH).build(workId))
                .accept(MediaType.APPLICATION_JSON)
                .exchange((request, response) -> {
                    HttpStatusCode status = response.getStatusCode();
                    String body = readBody(response);

                    if (status.value() == 404) {
                        if (isNoPaymentRecordsBody(body)) {
                            // §13.4: "no payment rows found; work may or may not exist".
                            // NOT zero expenditure, NOT an error.
                            return Optional.empty();
                        }
                        throw new EmpoweredIndianApiException(404, snippet(body),
                                "Empowered Indian payments endpoint returned an unexpected 404 for workId " + workId);
                    }
                    if (status.isError()) {
                        throw new EmpoweredIndianApiException(status.value(), snippet(body),
                                "Empowered Indian payments endpoint failed for workId " + workId);
                    }
                    return Optional.of(parseEnvelopeData(body, WorkPaymentsResponse.class, PAYMENTS_PATH));
                });
    }

    // ------------------------------------------------------------------
    // Body handling
    // ------------------------------------------------------------------

    private String readBody(ClientHttpResponse response) {
        try (InputStream in = response.getBody()) {
            byte[] bytes = in.readNBytes(MAX_RESPONSE_BYTES + 1);
            if (bytes.length > MAX_RESPONSE_BYTES) {
                throw new EmpoweredIndianResponseException(
                        "Empowered Indian response body exceeded the " + MAX_RESPONSE_BYTES + "-byte limit");
            }
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new EmpoweredIndianTransportException("I/O error reading Empowered Indian response body", e);
        }
    }

    private <T> T parseEnvelopeData(String body, Class<T> dataType, String path) {
        JsonNode root;
        try {
            root = objectMapper.readTree(body);
        } catch (JacksonException e) {
            throw new EmpoweredIndianResponseException(
                    "Empowered Indian GET " + path + " returned an unparseable body: " + snippet(body), e);
        }
        if (root == null || !root.path("success").asBoolean(false)) {
            throw new EmpoweredIndianResponseException(
                    "Empowered Indian GET " + path + " response was not success=true: " + snippet(body));
        }
        JsonNode data = root.get("data");
        if (data == null || !data.isObject()) {
            throw new EmpoweredIndianResponseException(
                    "Empowered Indian GET " + path + " response had no 'data' object: " + snippet(body));
        }
        try {
            return objectMapper.treeToValue(data, dataType);
        } catch (JacksonException e) {
            throw new EmpoweredIndianResponseException(
                    "Could not map Empowered Indian '" + path + "' data to " + dataType.getSimpleName(), e);
        }
    }

    private boolean isNoPaymentRecordsBody(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            return root != null
                    && !root.path("success").asBoolean(true)
                    && root.path("message").asText("").toLowerCase(Locale.ROOT).contains("no payment records");
        } catch (JacksonException e) {
            return false;
        }
    }

    private String snippet(String body) {
        if (body == null) {
            return "";
        }
        String trimmed = body.strip();
        int max = properties.maxErrorBodyChars();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max) + "...(truncated)";
    }

    // ------------------------------------------------------------------
    // Bounded retry
    // ------------------------------------------------------------------

    private <T> T withRetry(String operation, Supplier<T> call) {
        int maxAttempts = Math.max(1, properties.maxAttempts());
        EmpoweredIndianClientException lastFailure = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return call.get();
            } catch (ResourceAccessException e) {
                lastFailure = new EmpoweredIndianTransportException(
                        "Transport failure calling Empowered Indian (" + operation + ")", e);
            } catch (EmpoweredIndianTransportException e) {
                lastFailure = e;
            } catch (EmpoweredIndianApiException e) {
                if (!isRetryable(e)) {
                    throw e;
                }
                lastFailure = e;
            }
            // EmpoweredIndianResponseException is not caught here: it propagates immediately.

            if (attempt < maxAttempts) {
                log.warn("Empowered Indian call '{}' failed on attempt {}/{}: {} — retrying in {}",
                        operation, attempt, maxAttempts, lastFailure.getMessage(), properties.retryDelay());
                sleepBeforeRetry();
            }
        }
        log.warn("Empowered Indian call '{}' exhausted {} attempt(s)", operation, maxAttempts);
        throw lastFailure;
    }

    private static boolean isRetryable(EmpoweredIndianApiException e) {
        return e.statusCode() == 429 || e.statusCode() >= 500;
    }

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(properties.retryDelay().toMillis());
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new EmpoweredIndianTransportException("Interrupted while backing off before a retry", ie);
        }
    }
}
