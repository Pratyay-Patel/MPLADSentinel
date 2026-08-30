package com.mpladsentinel.grievance;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
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
import org.springframework.http.client.JdkClientHttpRequestFactory;

import com.mpladsentinel.auth.AppUserRepository;
import com.mpladsentinel.support.AbstractPostgresIntegrationTest;
import com.mpladsentinel.support.SessionLogin;

/**
 * End-to-end tests for the grievance API (round1-scope P1.5): the RBAC matrix
 * (citizen raises, MoSPI/State/District act, others read), citizen-sees-own vs
 * authority-sees-all, the status workflow, 404, and validation.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class GrievanceControllerTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private GrievanceRepository grievances;
    @Autowired
    private AppUserRepository users;

    /** A grievance owned by someone other than 'citizen' — used to check read scoping. */
    private Long otherUsersGrievanceId;

    @BeforeAll
    void setUp() {
        // The default JDK request factory cannot issue PATCH; the java.net.http one can.
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());

        Long mospiId = users.findByUsername("mospi").orElseThrow().getId();
        Grievance g = new Grievance("Other", "Seeded elsewhere",
                "This grievance was created directly for another user, not the citizen.");
        g.setSubmittedByUserId(mospiId);
        otherUsersGrievanceId = grievances.save(g).getId();
    }

    private HttpEntity<Map<String, Object>> body(Map<String, Object> json, String username) {
        HttpHeaders headers = new HttpHeaders(SessionLogin.cookieFor(rest, username));
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(json, headers);
    }

    private static Map<String, Object> validGrievance() {
        return Map.of(
                "workReference", 900000001L,
                "category", "Delay in execution",
                "subject", "Work stalled for months",
                "description", "There has been no visible progress on this work for a long time.",
                "contactName", "A Citizen",
                "contactEmail", "citizen@example.com");
    }

    @SuppressWarnings("unchecked")
    private long raiseGrievanceAsCitizen() {
        ResponseEntity<Map> response = rest.exchange("/api/grievances", HttpMethod.POST,
                body(validGrievance(), "citizen"), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return Long.parseLong((String) response.getBody().get("id"));
    }

    // --- raising -------------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void citizenCanRaiseAGrievanceInSubmittedState() {
        ResponseEntity<Map> response = rest.exchange("/api/grievances", HttpMethod.POST,
                body(validGrievance(), "citizen"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<String, Object> g = response.getBody();
        assertThat(g.get("id")).isInstanceOf(String.class);
        assertThat(g.get("status")).isEqualTo("SUBMITTED");
        assertThat(g.get("subject")).isEqualTo("Work stalled for months");
        assertThat(g.get("actionNote")).isNull();
    }

    @Test
    void governmentRolesCannotRaiseAGrievance() {
        for (String role : new String[] {"mospi", "state", "district", "auditor", "mp"}) {
            assertThat(rest.exchange("/api/grievances", HttpMethod.POST,
                    body(validGrievance(), role), String.class).getStatusCode())
                    .as(role).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void anonymousCannotRaiseAGrievance() {
        HttpHeaders json = new HttpHeaders();
        json.setContentType(MediaType.APPLICATION_JSON);
        assertThat(rest.exchange("/api/grievances", HttpMethod.POST,
                new HttpEntity<>(validGrievance(), json), String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsAShortDescriptionAnUnknownCategoryAndABadEmail() {
        Map<String, Object> shortDesc = new java.util.HashMap<>(validGrievance());
        shortDesc.put("description", "too short");
        assertThat(rest.exchange("/api/grievances", HttpMethod.POST, body(shortDesc, "citizen"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> badCategory = new java.util.HashMap<>(validGrievance());
        badCategory.put("category", "Not A Real Category");
        assertThat(rest.exchange("/api/grievances", HttpMethod.POST, body(badCategory, "citizen"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> badEmail = new java.util.HashMap<>(validGrievance());
        badEmail.put("contactEmail", "not-an-email");
        assertThat(rest.exchange("/api/grievances", HttpMethod.POST, body(badEmail, "citizen"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // --- reading (scoping) -----------------------------------------

    @Test
    void citizenSeesOnlyTheirOwnGrievances() {
        long mine = raiseGrievanceAsCitizen();

        Map<String, Object>[] list = rest.exchange("/api/grievances", HttpMethod.GET,
                new HttpEntity<>(new HttpHeaders(SessionLogin.cookieFor(rest, "citizen"))),
                Map[].class).getBody();

        assertThat(ids(list)).contains(String.valueOf(mine));
        assertThat(ids(list)).doesNotContain(String.valueOf(otherUsersGrievanceId));
    }

    @Test
    void authoritySeesEveryGrievance() {
        long citizenGrievance = raiseGrievanceAsCitizen();

        Map<String, Object>[] list = rest.exchange("/api/grievances", HttpMethod.GET,
                new HttpEntity<>(new HttpHeaders(SessionLogin.cookieFor(rest, "auditor"))),
                Map[].class).getBody();

        assertThat(ids(list))
                .contains(String.valueOf(citizenGrievance), String.valueOf(otherUsersGrievanceId));
    }

    // --- acting -----------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void mosPiCanAdvanceStatusAndRecordAnActionNote() {
        long id = raiseGrievanceAsCitizen();

        ResponseEntity<Map> response = rest.exchange("/api/grievances/" + id, HttpMethod.PATCH,
                body(Map.of("status", "UNDER_REVIEW", "actionNote", "Assigned to district office"),
                        "mospi"),
                Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("UNDER_REVIEW");
        assertThat(response.getBody().get("actionNote")).isEqualTo("Assigned to district office");
    }

    @Test
    void citizenAndAuditorCannotPatchAGrievance() {
        long id = raiseGrievanceAsCitizen();
        for (String role : new String[] {"citizen", "auditor", "mp"}) {
            assertThat(rest.exchange("/api/grievances/" + id, HttpMethod.PATCH,
                    body(Map.of("status", "CLOSED"), role), String.class).getStatusCode())
                    .as(role).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void patchingAnUnknownGrievanceIs404() {
        assertThat(rest.exchange("/api/grievances/99999999", HttpMethod.PATCH,
                body(Map.of("status", "CLOSED"), "mospi"), String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    private static String[] ids(Map<String, Object>[] list) {
        return Arrays.stream(list).map(g -> (String) g.get("id")).toArray(String[]::new);
    }
}
