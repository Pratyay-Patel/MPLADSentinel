package com.mpladsentinel.escrow;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

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

import com.mpladsentinel.auth.AppUser;
import com.mpladsentinel.auth.AppUserRepository;
import com.mpladsentinel.auth.WebRole;
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
 * End-to-end tests for the Escrow & Fund Control API: role gating, the
 * automatic approve/reject decision against real Postgres fixture data,
 * ownership scoping (District sees only their own), the release-notice
 * conflict rules, and that history is written and permanent.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class FundRequestControllerTest extends AbstractPostgresIntegrationTest {

    private static final long BASE = 3_600_000_000L;
    private static final long AMPLE_FUNDS_WORK = BASE + 1;
    private static final long TIGHT_FUNDS_WORK = BASE + 2;

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private WorkRepository workRepository;
    @Autowired
    private IngestionRunRepository ingestionRunRepository;
    @Autowired
    private AppUserRepository userRepository;
    @Autowired
    private FundRequestRepository fundRequestRepository;

    @BeforeAll
    void seed() {
        IngestionRun run = ingestionRunRepository.save(new IngestionRun(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL,
                IngestionRunStatus.RUNNING));

        Work ample = work(AMPLE_FUNDS_WORK, run);
        ample.setDistrict("Jaipur");
        ample.setEstimatedCost(new BigDecimal("1000000.00"));
        workRepository.saveAndFlush(ample);

        Work tight = work(TIGHT_FUNDS_WORK, run);
        tight.setDistrict("Jodhpur");
        tight.setEstimatedCost(new BigDecimal("100000.00"));
        workRepository.saveAndFlush(tight);
    }

    private static Work work(long id, IngestionRun run) {
        return new Work(SourceName.EMPOWERED_INDIAN, id, LifecycleState.RECOMMENDED, true, false, run);
    }

    private HttpEntity<Void> as(String username) {
        return new HttpEntity<>(SessionLogin.cookieFor(rest, username));
    }

    private HttpEntity<Object> asJson(String username, Object body) {
        HttpHeaders headers = SessionLogin.cookieFor(rest, username);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    // --- access control ---------------------------------------------

    @Test
    void listRequiresDistrictOrMospi() {
        assertThat(rest.getForEntity("/api/fund-requests", String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.exchange("/api/fund-requests", HttpMethod.GET, as("citizen"), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(rest.exchange("/api/fund-requests", HttpMethod.GET, as("auditor"), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void onlyDistrictCanCreateAndOnlyMospiCanSendReleaseNotice() {
        Map<String, Object> body = Map.of("sourceWorkId", AMPLE_FUNDS_WORK, "requestedAmount", 1000, "remarks", "x");
        assertThat(rest.exchange("/api/fund-requests", HttpMethod.POST, asJson("mospi", body), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(rest.exchange("/api/fund-requests", HttpMethod.POST, asJson("auditor", body), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<FundRequestResponse> created = rest.exchange(
                "/api/fund-requests", HttpMethod.POST, asJson("district", body), FundRequestResponse.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String id = created.getBody().id();

        assertThat(rest.exchange("/api/fund-requests/" + id + "/release-notice", HttpMethod.POST,
                as("district"), String.class).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- automatic decision -----------------------------------------

    @Test
    void approvesWhenWithinRemainingFundsAndRecordsHistory() {
        Map<String, Object> body = Map.of(
                "sourceWorkId", AMPLE_FUNDS_WORK, "requestedAmount", 250000, "remarks", "Q1 installment");

        FundRequestResponse created = rest.exchange(
                "/api/fund-requests", HttpMethod.POST, asJson("district", body), FundRequestResponse.class).getBody();

        assertThat(created.status()).isEqualTo(FundRequestStatus.APPROVED);
        assertThat(created.decisionReason()).contains("within the remaining sanctioned funds");
        assertThat(created.sanctionedAmount()).isEqualByComparingTo("1000000.00");
        assertThat(created.remainingBeforeRequest()).isEqualByComparingTo("1000000.00");
        assertThat(created.releaseNoticeSent()).isFalse();
        assertThat(created.history()).extracting(FundRequestEventResponse::eventType)
                .containsExactly(FundRequestEventType.CREATED, FundRequestEventType.APPROVED);
    }

    @Test
    void rejectsWhenRequestedAmountExceedsRemainingFundsAndStaysVisible() {
        Map<String, Object> body = Map.of(
                "sourceWorkId", TIGHT_FUNDS_WORK, "requestedAmount", 200000, "remarks", "too much");

        ResponseEntity<FundRequestResponse> response = rest.exchange(
                "/api/fund-requests", HttpMethod.POST, asJson("district", body), FundRequestResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED); // creating the request always succeeds
        FundRequestResponse created = response.getBody();

        assertThat(created.status()).isEqualTo(FundRequestStatus.REJECTED);
        assertThat(created.decisionReason()).contains("exceeds the remaining sanctioned funds");
        assertThat(created.history()).extracting(FundRequestEventResponse::eventType)
                .containsExactly(FundRequestEventType.CREATED, FundRequestEventType.REJECTED);

        // Rejected requests remain permanently visible -- MoSPI can still open it.
        FundRequestResponse fetched = rest.exchange("/api/fund-requests/" + created.id(), HttpMethod.GET,
                as("mospi"), FundRequestResponse.class).getBody();
        assertThat(fetched.status()).isEqualTo(FundRequestStatus.REJECTED);
        assertThat(fetched.decisionReason()).isEqualTo(created.decisionReason());
    }

    // --- release notice ------------------------------------------------

    @Test
    void sendsReleaseNoticeOnceAndRejectsASecondAttemptOrOnARejectedRequest() {
        Map<String, Object> approvable = Map.of(
                "sourceWorkId", AMPLE_FUNDS_WORK, "requestedAmount", 10000, "remarks", "notice test");
        FundRequestResponse approved = rest.exchange("/api/fund-requests", HttpMethod.POST,
                asJson("district", approvable), FundRequestResponse.class).getBody();
        assertThat(approved.status()).isEqualTo(FundRequestStatus.APPROVED);

        ResponseEntity<FundRequestResponse> sent = rest.exchange(
                "/api/fund-requests/" + approved.id() + "/release-notice", HttpMethod.POST,
                as("mospi"), FundRequestResponse.class);
        assertThat(sent.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(sent.getBody().releaseNoticeSent()).isTrue();
        assertThat(sent.getBody().releaseNoticeByName()).isEqualTo("MoSPI / Ministry");
        assertThat(sent.getBody().releaseNoticeAt()).isNotNull();
        assertThat(sent.getBody().history()).extracting(FundRequestEventResponse::eventType)
                .containsExactly(FundRequestEventType.CREATED, FundRequestEventType.APPROVED,
                        FundRequestEventType.RELEASE_NOTICE_SENT);

        // Second attempt is a conflict.
        assertThat(rest.exchange("/api/fund-requests/" + approved.id() + "/release-notice", HttpMethod.POST,
                as("mospi"), String.class).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // A rejected request can never have a release notice sent.
        Map<String, Object> rejectable = Map.of(
                "sourceWorkId", TIGHT_FUNDS_WORK, "requestedAmount", 999999, "remarks", "will be rejected");
        FundRequestResponse rejected = rest.exchange("/api/fund-requests", HttpMethod.POST,
                asJson("district", rejectable), FundRequestResponse.class).getBody();
        assertThat(rejected.status()).isEqualTo(FundRequestStatus.REJECTED);
        assertThat(rest.exchange("/api/fund-requests/" + rejected.id() + "/release-notice", HttpMethod.POST,
                as("mospi"), String.class).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    // --- ownership scoping ---------------------------------------------

    @Test
    void districtSeesOnlyItsOwnRequestsWhileMospiSeesAll() {
        AppUser otherDistrict = userRepository.findByUsername("district2")
                .orElseGet(() -> userRepository.save(new AppUser(
                        "district2", userRepository.findByUsername("district").orElseThrow().getPasswordHash(),
                        WebRole.DISTRICT, "Another District Officer")));

        FundRequest other = new FundRequest(AMPLE_FUNDS_WORK, otherDistrict.getId(),
                new BigDecimal("5000.00"), "someone else's request");
        other.decide(FundRequestStatus.APPROVED, "test fixture", java.time.Instant.now());
        fundRequestRepository.saveAndFlush(other);

        List<?> asDistrict = rest.exchange("/api/fund-requests", HttpMethod.GET, as("district"), List.class).getBody();
        assertThat(asDistrict).noneMatch(row -> String.valueOf(other.getId()).equals(((Map<?, ?>) row).get("id")));

        List<?> asMospi = rest.exchange("/api/fund-requests", HttpMethod.GET, as("mospi"), List.class).getBody();
        assertThat(asMospi).anyMatch(row -> String.valueOf(other.getId()).equals(((Map<?, ?>) row).get("id")));
    }
}
