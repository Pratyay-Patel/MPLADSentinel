package com.mpladsentinel.mplads.risk;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.support.AbstractPostgresIntegrationTest;
import com.mpladsentinel.support.SessionLogin;

/**
 * End-to-end tests for the risk APIs (decision D22): the bulk and single
 * endpoints, role gating, and 404. Uses the real system clock with clearly
 * dated fixtures so the banding is unambiguous.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class RiskControllerTest extends AbstractPostgresIntegrationTest {

    private static final long BASE = 3_400_000_000L;
    private static final long CLEAN = BASE + 1;
    private static final long DORMANT = BASE + 2;
    private static final long OVERSPENT = BASE + 3;
    private static final long UNKNOWN_ID = 999_999_997L;

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private WorkRepository workRepository;
    @Autowired
    private IngestionRunRepository ingestionRunRepository;

    @BeforeAll
    void seed() {
        IngestionRun run = ingestionRunRepository.save(new IngestionRun(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL,
                IngestionRunStatus.RUNNING));

        Work clean = work(CLEAN, run);
        clean.setEstimatedCost(new BigDecimal("1000000.00"));
        clean.setRecommendedOn(LocalDate.now().minusMonths(2)); // recent -> not dormant
        workRepository.saveAndFlush(clean);

        Work dormant = work(DORMANT, run);
        dormant.setEstimatedCost(new BigDecimal("500000.00"));
        dormant.setRecommendedOn(LocalDate.now().minusYears(5)); // long-dormant
        dormant.setPaymentDataState(PaymentDataState.NOT_FETCHED);
        workRepository.saveAndFlush(dormant);

        Work overspent = work(OVERSPENT, run);
        overspent.setEstimatedCost(new BigDecimal("1000000.00"));
        overspent.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        overspent.setPaymentTotalPaid(new BigDecimal("1500000.00"));
        workRepository.saveAndFlush(overspent);
    }

    private static Work work(long id, IngestionRun run) {
        return new Work(SourceName.EMPOWERED_INDIAN, id, LifecycleState.RECOMMENDED, true, false, run);
    }

    private HttpEntity<Void> as(String username) {
        return new HttpEntity<>(SessionLogin.cookieFor(rest, username));
    }

    // --- access control ---------------------------------------------

    @Test
    void bulkRiskRequiresAnAuthorityRole() {
        assertThat(rest.getForEntity("/api/works/risk", String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.exchange("/api/works/risk", HttpMethod.GET, as("citizen"), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- bulk -----------------------------------------------------

    @Test
    void bulkRiskAssessesEveryWork() {
        RiskAssessment[] all = rest.exchange(
                "/api/works/risk", HttpMethod.GET, as("mospi"), RiskAssessment[].class).getBody();

        assertThat(level(all, CLEAN)).isEqualTo(RiskLevel.LOW);
        assertThat(assessment(all, CLEAN).score()).isZero();
        assertThat(assessment(all, CLEAN).reasons()).isEmpty();

        assertThat(level(all, DORMANT)).isEqualTo(RiskLevel.HIGH);
        assertThat(assessment(all, DORMANT).reasons())
                .anyMatch(s -> s.contains("no payment records"));
        assertThat(assessment(all, DORMANT).assessedAt()).isNotNull();

        assertThat(level(all, OVERSPENT)).isEqualTo(RiskLevel.HIGH);
        assertThat(assessment(all, OVERSPENT).reasons())
                .anyMatch(s -> s.contains("exceed the estimated cost by 50%"));
    }

    // --- single -------------------------------------------------

    @Test
    void singleRiskReturnsOneAssessment() {
        RiskAssessment dormant = rest.exchange(
                "/api/works/" + DORMANT + "/risk", HttpMethod.GET, as("auditor"),
                RiskAssessment.class).getBody();

        assertThat(dormant).isNotNull();
        assertThat(dormant.sourceWorkId()).isEqualTo(DORMANT);
        assertThat(dormant.level()).isEqualTo(RiskLevel.HIGH);
        assertThat(dormant.reasons()).isNotEmpty();
    }

    @Test
    void singleRiskForACleanWorkIsLowWithNoReasons() {
        RiskAssessment clean = rest.exchange(
                "/api/works/" + CLEAN + "/risk", HttpMethod.GET, as("mospi"),
                RiskAssessment.class).getBody();

        assertThat(clean.level()).isEqualTo(RiskLevel.LOW);
        assertThat(clean.score()).isZero();
        assertThat(clean.reasons()).isEmpty();
    }

    @Test
    void singleRiskForAnUnknownWorkIs404() {
        assertThat(rest.exchange("/api/works/" + UNKNOWN_ID + "/risk", HttpMethod.GET,
                as("mospi"), String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // --- helpers ------------------------------------------------

    private static RiskAssessment assessment(RiskAssessment[] all, long sourceWorkId) {
        return Arrays.stream(all).filter(a -> a.sourceWorkId() == sourceWorkId)
                .findFirst().orElseThrow(() -> new AssertionError("no assessment for " + sourceWorkId));
    }

    private static RiskLevel level(RiskAssessment[] all, long sourceWorkId) {
        return assessment(all, sourceWorkId).level();
    }
}
