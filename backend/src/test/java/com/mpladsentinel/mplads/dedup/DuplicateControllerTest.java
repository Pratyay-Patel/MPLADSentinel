package com.mpladsentinel.mplads.dedup;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
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
 * End-to-end tests for the de-duplication API (F7, decision D35): role
 * gating and a real near-duplicate pair found against the real Postgres
 * fixture data.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DuplicateControllerTest extends AbstractPostgresIntegrationTest {

    private static final long BASE = 3_500_000_000L;
    private static final long DUP_A = BASE + 1;
    private static final long DUP_B = BASE + 2;
    private static final long UNRELATED = BASE + 3;

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

        Work a = work(DUP_A, run);
        a.setState("Rajasthan");
        a.setDistrict("Jaipur");
        a.setCategory("Roads & Transportation");
        a.setWorkDescription("construction of community hall in gram panchayat area for public use");
        workRepository.saveAndFlush(a);

        Work b = work(DUP_B, run);
        b.setState("Rajasthan");
        b.setDistrict("Jaipur");
        b.setCategory("Roads & Transportation");
        b.setWorkDescription("construction of community hall in gram panchayat area for general use");
        workRepository.saveAndFlush(b);

        Work unrelated = work(UNRELATED, run);
        unrelated.setState("Kerala");
        unrelated.setDistrict("Kochi");
        unrelated.setCategory("Health Infrastructure");
        unrelated.setWorkDescription("renovation of a primary health sub-centre");
        unrelated.setEstimatedCost(new BigDecimal("2000000"));
        workRepository.saveAndFlush(unrelated);
    }

    private static Work work(long id, IngestionRun run) {
        return new Work(SourceName.EMPOWERED_INDIAN, id, LifecycleState.RECOMMENDED, true, false, run);
    }

    private HttpEntity<Void> as(String username) {
        return new HttpEntity<>(SessionLogin.cookieFor(rest, username));
    }

    // --- access control ---------------------------------------------

    @Test
    void duplicatesRequiresAnAuthorityRole() {
        assertThat(rest.getForEntity("/api/works/duplicates", String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.exchange("/api/works/duplicates", HttpMethod.GET, as("citizen"), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- matching -----------------------------------------------

    @Test
    void findsTheNearIdenticalPairAndExcludesUnrelatedWorks() {
        DuplicatePair[] all = rest.exchange(
                "/api/works/duplicates", HttpMethod.GET, as("mospi"), DuplicatePair[].class).getBody();

        assertThat(all).isNotNull();
        DuplicatePair pair = Arrays.stream(all)
                .filter(p -> ids(p).contains(DUP_A) && ids(p).contains(DUP_B))
                .findFirst()
                .orElseThrow(() -> new AssertionError("expected a pair for " + DUP_A + "/" + DUP_B));

        assertThat(pair.confidence()).isEqualTo(DuplicateConfidence.HIGH);
        assertThat(pair.reasons()).anyMatch(r -> r.contains("similar"));

        assertThat(all).noneMatch(p -> ids(p).contains(UNRELATED));
    }

    private static java.util.Set<Long> ids(DuplicatePair pair) {
        return java.util.Set.of(pair.workA().sourceWorkId(), pair.workB().sourceWorkId());
    }
}
