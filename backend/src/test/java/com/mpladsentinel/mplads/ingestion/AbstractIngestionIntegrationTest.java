package com.mpladsentinel.mplads.ingestion;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.mpladsentinel.support.AbstractPostgresIntegrationTest;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.QueueDispatcher;

/**
 * Base for ingestion integration tests: a real PostgreSQL (via
 * {@link AbstractPostgresIntegrationTest}) plus a local {@link MockWebServer}
 * standing in for the Empowered Indian API. No test here touches the live
 * service; the live contract check for the completed endpoint is a separate
 * manual step (Q10), not part of this suite.
 */
@SpringBootTest
abstract class AbstractIngestionIntegrationTest extends AbstractPostgresIntegrationTest {

    protected static final MockWebServer MOCK = new MockWebServer();

    static {
        try {
            MOCK.start();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void ingestionProperties(DynamicPropertyRegistry registry) {
        registry.add("mplads.empowered-indian.base-url", () -> MOCK.url("/api").toString());
        registry.add("mplads.empowered-indian.max-attempts", () -> "1");
        registry.add("mplads.empowered-indian.connect-timeout", () -> "2s");
        registry.add("mplads.empowered-indian.read-timeout", () -> "5s");
        registry.add("mplads.ingestion.works-inter-page-delay", () -> "0ms");
        registry.add("mplads.ingestion.payments-inter-request-delay", () -> "0ms");
    }

    // MOCK is a JVM-lifetime singleton shared by every ingestion IT class (like the
    // Postgres container); it is never shut down between classes.

    @Autowired
    protected IngestionService ingestionService;
    @Autowired
    protected JdbcTemplate jdbc;

    @BeforeEach
    void resetState() {
        MOCK.setDispatcher(new QueueDispatcher());
        jdbc.execute("truncate table work_payment, ingestion_dead_letter, raw_source_record, work, "
                + "ingestion_run restart identity cascade");
    }

    protected static MockResponse json(int status, String body) {
        return new MockResponse()
                .setResponseCode(status)
                .setHeader("Content-Type", "application/json")
                .setBody(body);
    }

    protected static MockResponse ok(String body) {
        return json(200, body);
    }

    protected void enqueue(MockResponse response) {
        MOCK.enqueue(response);
    }

    protected long count(String sql, Object... args) {
        Long n = jdbc.queryForObject(sql, Long.class, args);
        return n == null ? 0L : n;
    }
}
