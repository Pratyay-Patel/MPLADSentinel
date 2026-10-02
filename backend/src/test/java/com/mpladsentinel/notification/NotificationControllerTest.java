package com.mpladsentinel.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.support.AbstractPostgresIntegrationTest;
import com.mpladsentinel.support.SessionLogin;

/**
 * End-to-end tests for the notification API: the real high-risk-alert
 * bootstrap (reusing the actual {@code RiskEngine}), the Send Notice action
 * (always addressed to the seeded District Authority), mark-read /
 * mark-all-read, "clear all" (dismiss, not delete), and the RBAC matrix.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class NotificationControllerTest extends AbstractPostgresIntegrationTest {

    private static final AtomicLong SEQ = new AtomicLong(700_000_000);

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private WorkRepository works;
    @Autowired
    private IngestionRunRepository ingestionRuns;

    @BeforeAll
    void setUp() {
        // The default JDK request factory cannot issue PATCH/other verbs reliably here either.
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    /** Persists a work that the real RiskEngine will assess HIGH (long-dormant, no payments). */
    private long newHighRiskWork(String description) {
        long sourceWorkId = SEQ.incrementAndGet();
        Work work = newWork(sourceWorkId, description);
        work.setRecommendedOn(LocalDate.now().minusMonths(40));
        works.save(work);
        return sourceWorkId;
    }

    /** Persists a plain work with no risk indicators — for send-notice tests. */
    private long newPlainWork(String description) {
        long sourceWorkId = SEQ.incrementAndGet();
        works.save(newWork(sourceWorkId, description));
        return sourceWorkId;
    }

    private Work newWork(long sourceWorkId, String description) {
        IngestionRun run = ingestionRuns.save(new IngestionRun(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL,
                IngestionRunStatus.RUNNING));
        Work work = new Work(SourceName.EMPOWERED_INDIAN, sourceWorkId,
                LifecycleState.RECOMMENDED, true, false, run);
        work.setWorkDescription(description);
        return work;
    }

    private HttpEntity<Object> as(String username) {
        return new HttpEntity<>(new HttpHeaders(SessionLogin.cookieFor(rest, username)));
    }

    private HttpEntity<Map<String, Object>> body(Map<String, Object> json, String username) {
        HttpHeaders headers = new HttpHeaders(SessionLogin.cookieFor(rest, username));
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(json, headers);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object>[] listAs(String username) {
        return rest.exchange("/api/notifications", HttpMethod.GET, as(username), Map[].class).getBody();
    }

    // --- high-risk alert bootstrap ---------------------------------------

    @Test
    void seedingRealHighRiskAlertsIsIdempotent() {
        // A dormant, no-payment, 40-months-old work genuinely scores HIGH under
        // the real RiskEngine (weight 55 for >=36 months, decision D22) — this
        // proves the wiring is real, not that this exact work survives the
        // top-N cap: the shared test Postgres also carries whatever HIGH-risk
        // fixtures other test classes (e.g. RiskEngineTest) have created, so
        // asserting an exact work is in the capped list would be order-flaky.
        newHighRiskWork("Dormant anganwadi repair");

        Map<String, Object>[] first = listAs("auditor");
        List<String> firstHighRiskIds = highRiskNotificationIds(first);
        assertThat(firstHighRiskIds).isNotEmpty();

        // Loading again must reuse the same seeded set, not append duplicates.
        Map<String, Object>[] second = listAs("auditor");
        assertThat(highRiskNotificationIds(second)).isEqualTo(firstHighRiskIds);
    }

    private static List<String> highRiskNotificationIds(Map<String, Object>[] notifications) {
        return Arrays.stream(notifications)
                .filter(n -> "HIGH_RISK_WORK".equals(n.get("category")))
                .map(n -> (String) n.get("id"))
                .sorted()
                .toList();
    }

    @Test
    void aCitizenNeverGetsHighRiskWorkAlertsSeeded() {
        // Risk is not exposed to citizens (RiskController) — the bootstrap must
        // not leak it into their notification feed either.
        newHighRiskWork("Another dormant work, for the citizen check");

        assertThat(highRiskNotificationIds(listAs("citizen"))).isEmpty();
    }

    @Test
    void anyAuthenticatedRoleCanListItsOwnNotifications() {
        // Not scoped to a specific outcome (the real high-risk bootstrap may or
        // may not have anything to seed for 'mp' depending on what other tests
        // have committed) — this just proves GET never 403s/404s for a role that
        // has simply never been sent a notice.
        assertThat(rest.exchange("/api/notifications", HttpMethod.GET, as("mp"), Map[].class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // --- send notice -------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void sendingANoticeCreatesItInTheDistrictAuthoritysFeed() {
        long workId = newPlainWork("Solar street lighting");

        ResponseEntity<Map> response = rest.exchange("/api/notifications/send-notice", HttpMethod.POST,
                body(Map.of("sourceWorkId", workId), "mospi"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("category")).isEqualTo("SLA_NOTICE");
        assertThat(((Number) response.getBody().get("sourceWorkId")).longValue()).isEqualTo(workId);

        Map<String, Object>[] districtFeed = listAs("district");
        assertThat(Arrays.stream(districtFeed)
                .anyMatch(n -> "SLA_NOTICE".equals(n.get("category"))
                        && ((Number) n.get("sourceWorkId")).longValue() == workId))
                .isTrue();
    }

    @Test
    void sendingANoticeForAnUnknownWorkIs400() {
        assertThat(rest.exchange("/api/notifications/send-notice", HttpMethod.POST,
                body(Map.of("sourceWorkId", 9_999_999_999L), "mospi"), String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void onlyAuthoritiesMaySendANotice() {
        long workId = newPlainWork("Rural sanitation block");
        for (String role : new String[] {"citizen", "auditor", "mp", "state", "district"}) {
            HttpStatus expected = switch (role) {
                case "citizen" -> HttpStatus.FORBIDDEN;
                default -> HttpStatus.CREATED;
            };
            assertThat(rest.exchange("/api/notifications/send-notice", HttpMethod.POST,
                    body(new HashMap<>(Map.of("sourceWorkId", workId)), role), String.class)
                    .getStatusCode()).as(role).isEqualTo(expected);
        }
    }

    @Test
    void anonymousCannotSendANotice() {
        long workId = newPlainWork("Bus waiting shed");
        HttpHeaders json = new HttpHeaders();
        json.setContentType(MediaType.APPLICATION_JSON);
        assertThat(rest.exchange("/api/notifications/send-notice", HttpMethod.POST,
                new HttpEntity<>(Map.of("sourceWorkId", workId), json), String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // --- mark read / mark all read / clear -----------------------------

    @SuppressWarnings("unchecked")
    private long sendNoticeAndReturnId(long workId, String sender) {
        ResponseEntity<Map> response = rest.exchange("/api/notifications/send-notice", HttpMethod.POST,
                body(Map.of("sourceWorkId", workId), sender), Map.class);
        return Long.parseLong((String) response.getBody().get("id"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void ownerCanMarkOneNotificationReadButAnotherUserCannot() {
        long workId = newPlainWork("Digital smart classroom");
        long id = sendNoticeAndReturnId(workId, "mospi");

        ResponseEntity<Map> notMine = rest.exchange("/api/notifications/" + id + "/read", HttpMethod.POST,
                as("mospi"), Map.class);
        assertThat(notMine.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<Map> mine = rest.exchange("/api/notifications/" + id + "/read", HttpMethod.POST,
                as("district"), Map.class);
        assertThat(mine.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(mine.getBody().get("read")).isEqualTo(true);
    }

    @Test
    void markAllReadMarksEveryActiveNotificationOfTheCallerRead() {
        long workA = newPlainWork("Crematorium shed improvement");
        long workB = newPlainWork("Protection wall along a village pond");
        sendNoticeAndReturnId(workA, "mospi");
        sendNoticeAndReturnId(workB, "state");

        assertThat(rest.exchange("/api/notifications/mark-all-read", HttpMethod.POST, as("district"),
                Void.class).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        Map<String, Object>[] feed = listAs("district");
        assertThat(feed).allSatisfy(n -> assertThat(n.get("read")).isEqualTo(true));
    }

    @Test
    void clearAllHidesNotificationsFromTheFeedButKeepsThemPersisted() {
        long workId = newPlainWork("Library and reading room");
        sendNoticeAndReturnId(workId, "mospi");
        assertThat(listAs("district")).isNotEmpty();

        assertThat(rest.exchange("/api/notifications/clear", HttpMethod.POST, as("district"), Void.class)
                .getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(listAs("district")).isEmpty();

        // Sending a fresh notice afterwards still works — clearing didn't corrupt the feed.
        long anotherWork = newPlainWork("Renovation of a primary health sub-centre");
        sendNoticeAndReturnId(anotherWork, "mospi");
        assertThat(listAs("district")).hasSize(1);
    }
}
