package com.mpladsentinel.inspection;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.HashMap;
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
 * End-to-end tests for the inspection-assignment API
 * ({@code docs/inspections-audit-feature.md}): the RBAC matrix, work / officer
 * validation, the open-assignment conflict, the status-transition rules, and the
 * list filters.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class InspectionAssignmentControllerTest extends AbstractPostgresIntegrationTest {

    /** Unique source_work_id per test so the shared DB stays collision-free. */
    private static final AtomicLong SEQ = new AtomicLong(2_100_000_000L);

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private WorkRepository works;
    @Autowired
    private IngestionRunRepository ingestionRuns;

    @BeforeAll
    void setUp() {
        // The default JDK request factory cannot issue PATCH; the java.net.http one can.
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    /** Persist a fresh work and return its source id. */
    private long newWork(String description) {
        IngestionRun run = ingestionRuns.save(new IngestionRun(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL,
                IngestionRunStatus.RUNNING));
        long sourceWorkId = SEQ.incrementAndGet();
        Work work = new Work(SourceName.EMPOWERED_INDIAN, sourceWorkId,
                LifecycleState.RECOMMENDED, true, false, run);
        work.setWorkDescription(description);
        works.save(work);
        return sourceWorkId;
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
    private Map<String, Object> createAssignment(long sourceWorkId, String officerCode, String actor) {
        ResponseEntity<Map> response = rest.exchange("/api/assignments", HttpMethod.POST,
                body(new HashMap<>(Map.of("sourceWorkId", sourceWorkId, "officerCode", officerCode)), actor),
                Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody();
    }

    // --- officers dropdown --------------------------------------------

    @Test
    void officersEndpointListsTheSeededFieldOfficers() {
        Map<String, Object>[] officers = rest.exchange("/api/officers", HttpMethod.GET,
                as("auditor"), Map[].class).getBody();

        assertThat(Arrays.stream(officers).map(o -> o.get("officerCode")))
                .contains("OFF101", "OFF102", "OFF103", "OFF104", "OFF105");
        Map<String, Object> off102 = Arrays.stream(officers)
                .filter(o -> "OFF102".equals(o.get("officerCode"))).findFirst().orElseThrow();
        assertThat(off102.get("name")).isEqualTo("Rahul Sharma");
        assertThat(off102.get("phone")).isNotNull();
    }

    @Test
    void aFieldOfficerCannotReachTheAuthorityEndpoints() {
        assertThat(rest.exchange("/api/officers", HttpMethod.GET, as("off102"), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(rest.exchange("/api/assignments", HttpMethod.GET, as("off102"), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- creating ----------------------------------------------------

    @Test
    void mospiCanAssignAWorkToAnOfficerInAssignedState() {
        long workId = newWork("Community Hall Development");

        Map<String, Object> created = createAssignment(workId, "OFF102", "mospi");

        assertThat(created.get("id")).isInstanceOf(String.class);
        assertThat(created.get("status")).isEqualTo("ASSIGNED");
        assertThat(created.get("officerCode")).isEqualTo("OFF102");
        assertThat(created.get("officerName")).isEqualTo("Rahul Sharma");
        assertThat(created.get("workTitle")).isEqualTo("Community Hall Development");
        assertThat(((Number) created.get("sourceWorkId")).longValue()).isEqualTo(workId);
        assertThat(created.get("assignedByName")).isEqualTo("MoSPI / Ministry");
    }

    @Test
    void auditorAndMpAndAnonymousCannotAssign() {
        long workId = newWork("Road resurfacing");
        Map<String, Object> payload = new HashMap<>(Map.of("sourceWorkId", workId, "officerCode", "OFF101"));

        for (String role : new String[] {"auditor", "mp"}) {
            assertThat(rest.exchange("/api/assignments", HttpMethod.POST, body(payload, role), String.class)
                    .getStatusCode()).as(role).isEqualTo(HttpStatus.FORBIDDEN);
        }
        HttpHeaders json = new HttpHeaders();
        json.setContentType(MediaType.APPLICATION_JSON);
        assertThat(rest.exchange("/api/assignments", HttpMethod.POST, new HttpEntity<>(payload, json),
                String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsAnUnknownOfficerAndAnUnknownWork() {
        long workId = newWork("Anganwadi repair");

        assertThat(rest.exchange("/api/assignments", HttpMethod.POST,
                body(new HashMap<>(Map.of("sourceWorkId", workId, "officerCode", "OFF999")), "state"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(rest.exchange("/api/assignments", HttpMethod.POST,
                body(new HashMap<>(Map.of("sourceWorkId", 9_999_999_999L, "officerCode", "OFF101")), "state"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @SuppressWarnings("unchecked")
    void requiredPhotosDefaultsToTwoAndAcceptsAnExplicitValueAndIsEditable() {
        long defaultWork = newWork("Footbridge");
        assertThat(((Number) createAssignment(defaultWork, "OFF101", "mospi").get("requiredPhotos")).intValue())
                .isEqualTo(2);

        long customWork = newWork("Water pipeline");
        ResponseEntity<Map> created = rest.exchange("/api/assignments", HttpMethod.POST,
                body(new HashMap<>(Map.of("sourceWorkId", customWork, "officerCode", "OFF102",
                        "requiredPhotos", 5)), "state"),
                Map.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(((Number) created.getBody().get("requiredPhotos")).intValue()).isEqualTo(5);

        String id = (String) created.getBody().get("id");
        ResponseEntity<Map> patched = rest.exchange("/api/assignments/" + id, HttpMethod.PATCH,
                body(Map.of("requiredPhotos", 8), "state"), Map.class);
        assertThat(patched.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Number) patched.getBody().get("requiredPhotos")).intValue()).isEqualTo(8);
    }

    @Test
    void rejectsAnOutOfRangeRequiredPhotos() {
        long workId = newWork("Street lighting");
        for (int bad : new int[] {0, 21}) {
            assertThat(rest.exchange("/api/assignments", HttpMethod.POST,
                    body(new HashMap<>(Map.of("sourceWorkId", workId, "officerCode", "OFF103",
                            "requiredPhotos", bad)), "state"),
                    String.class).getStatusCode()).as("requiredPhotos=%d", bad)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void aSecondOpenAssignmentForTheSameWorkAndOfficerIsAConflict() {
        long workId = newWork("Drainage line");
        createAssignment(workId, "OFF103", "district");

        ResponseEntity<String> second = rest.exchange("/api/assignments", HttpMethod.POST,
                body(new HashMap<>(Map.of("sourceWorkId", workId, "officerCode", "OFF103")), "district"),
                String.class);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    // --- status workflow -------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void statusAdvancesAssignedToInProgressToCompletedButNotBackwards() {
        long workId = newWork("Library block");
        String id = (String) createAssignment(workId, "OFF104", "mospi").get("id");

        ResponseEntity<Map> toInProgress = rest.exchange("/api/assignments/" + id, HttpMethod.PATCH,
                body(Map.of("status", "IN_PROGRESS"), "district"), Map.class);
        assertThat(toInProgress.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(toInProgress.getBody().get("status")).isEqualTo("IN_PROGRESS");

        ResponseEntity<Map> toCompleted = rest.exchange("/api/assignments/" + id, HttpMethod.PATCH,
                body(Map.of("status", "COMPLETED"), "district"), Map.class);
        assertThat(toCompleted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(toCompleted.getBody().get("status")).isEqualTo("COMPLETED");

        ResponseEntity<String> backwards = rest.exchange("/api/assignments/" + id, HttpMethod.PATCH,
                body(Map.of("status", "ASSIGNED"), "district"), String.class);
        assertThat(backwards.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void auditorCannotPatchAndUnknownIdIs404() {
        long workId = newWork("Water tank");
        String id = (String) createAssignment(workId, "OFF105", "mospi").get("id");

        assertThat(rest.exchange("/api/assignments/" + id, HttpMethod.PATCH,
                body(Map.of("status", "IN_PROGRESS"), "auditor"), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        assertThat(rest.exchange("/api/assignments/99999999", HttpMethod.PATCH,
                body(Map.of("status", "IN_PROGRESS"), "mospi"), String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    // --- list filters --------------------------------------------

    @Test
    void listFiltersByWorkAndStatus() {
        long workId = newWork("Bus shelter");
        createAssignment(workId, "OFF101", "state");

        Map<String, Object>[] byWork = rest.exchange(
                "/api/assignments?sourceWorkId=" + workId, HttpMethod.GET, as("mp"), Map[].class).getBody();
        assertThat(byWork).hasSize(1);
        assertThat(byWork[0].get("officerCode")).isEqualTo("OFF101");

        Map<String, Object>[] assignedForWork = rest.exchange(
                "/api/assignments?sourceWorkId=" + workId + "&status=ASSIGNED", HttpMethod.GET,
                as("mp"), Map[].class).getBody();
        assertThat(assignedForWork).hasSize(1);

        Map<String, Object>[] completedForWork = rest.exchange(
                "/api/assignments?sourceWorkId=" + workId + "&status=COMPLETED", HttpMethod.GET,
                as("mp"), Map[].class).getBody();
        assertThat(completedForWork).isEmpty();
    }
}
