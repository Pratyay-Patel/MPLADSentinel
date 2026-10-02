package com.mpladsentinel.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.HashMap;
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
 * End-to-end tests for the work-recommendation API: the RBAC matrix (citizen
 * proposes, MoSPI/State/District act, others read), citizen-sees-own vs
 * authority-sees-all, the status workflow, tracking-number generation, 404,
 * and validation.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class WorkRecommendationControllerTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private WorkRecommendationRepository recommendations;
    @Autowired
    private AppUserRepository users;

    /** A recommendation owned by someone other than 'citizen' — used to check read scoping. */
    private Long otherUsersRecommendationId;

    @BeforeAll
    void setUp() {
        // The default JDK request factory cannot issue PATCH; the java.net.http one can.
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());

        Long mospiId = users.findByUsername("mospi").orElseThrow().getId();
        WorkRecommendation r = new WorkRecommendation(
                "Someone Else", "9876543210", "Rajasthan", "A. MP", "Jaipur Rural",
                LocationCategory.RURAL, "26.9124,75.7873", "Seeded elsewhere",
                "Roads & Transportation", "This recommendation was created directly for another user.",
                "CIT-2026-999999");
        r.setSubmittedByUserId(mospiId);
        otherUsersRecommendationId = recommendations.save(r).getId();
    }

    private HttpEntity<Map<String, Object>> body(Map<String, Object> json, String username) {
        HttpHeaders headers = new HttpHeaders(SessionLogin.cookieFor(rest, username));
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(json, headers);
    }

    private static Map<String, Object> validRecommendation() {
        return Map.ofEntries(
                Map.entry("fullName", "A Citizen"),
                Map.entry("mobileNumber", "9876543210"),
                Map.entry("email", "citizen@example.com"),
                Map.entry("state", "Maharashtra"),
                Map.entry("mpName", "Some MP"),
                Map.entry("constituency", "Pune"),
                Map.entry("locationCategory", "URBAN"),
                Map.entry("gpsCoordinatesLink", "https://maps.google.com/?q=18.5204,73.8567"),
                Map.entry("workTitle", "Construction of a community hall"),
                Map.entry("category", "Community & Public Buildings"),
                Map.entry("description", "There is no community hall within several kilometres of this ward."));
    }

    @SuppressWarnings("unchecked")
    private long submitAsCitizen() {
        ResponseEntity<Map> response = rest.exchange("/api/recommendations", HttpMethod.POST,
                body(validRecommendation(), "citizen"), Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return Long.parseLong((String) response.getBody().get("id"));
    }

    // --- submitting -------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void citizenCanSubmitARecommendationInSubmittedStateWithARealTrackingNumber() {
        ResponseEntity<Map> response = rest.exchange("/api/recommendations", HttpMethod.POST,
                body(validRecommendation(), "citizen"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<String, Object> r = response.getBody();
        assertThat(r.get("id")).isInstanceOf(String.class);
        assertThat(r.get("status")).isEqualTo("SUBMITTED");
        assertThat(r.get("workTitle")).isEqualTo("Construction of a community hall");
        assertThat((String) r.get("trackingNumber")).matches("CIT-\\d{4}-\\d{6}");
        assertThat(r.get("actionNote")).isNull();
    }

    @Test
    @SuppressWarnings("unchecked")
    void eachSubmissionGetsItsOwnUniqueTrackingNumber() {
        ResponseEntity<Map> first = rest.exchange("/api/recommendations", HttpMethod.POST,
                body(validRecommendation(), "citizen"), Map.class);
        ResponseEntity<Map> second = rest.exchange("/api/recommendations", HttpMethod.POST,
                body(validRecommendation(), "citizen"), Map.class);

        assertThat(first.getBody().get("trackingNumber"))
                .isNotEqualTo(second.getBody().get("trackingNumber"));
    }

    @Test
    void governmentRolesCannotSubmitARecommendation() {
        for (String role : new String[] {"mospi", "state", "district", "auditor", "mp"}) {
            assertThat(rest.exchange("/api/recommendations", HttpMethod.POST,
                    body(validRecommendation(), role), String.class).getStatusCode())
                    .as(role).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void anonymousCannotSubmitARecommendation() {
        HttpHeaders json = new HttpHeaders();
        json.setContentType(MediaType.APPLICATION_JSON);
        assertThat(rest.exchange("/api/recommendations", HttpMethod.POST,
                new HttpEntity<>(validRecommendation(), json), String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsAShortDescriptionABadMobileNumberAndAnUnknownCategory() {
        Map<String, Object> shortDesc = new HashMap<>(validRecommendation());
        shortDesc.put("description", "too short");
        assertThat(rest.exchange("/api/recommendations", HttpMethod.POST, body(shortDesc, "citizen"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> badMobile = new HashMap<>(validRecommendation());
        badMobile.put("mobileNumber", "12345");
        assertThat(rest.exchange("/api/recommendations", HttpMethod.POST, body(badMobile, "citizen"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> badCategory = new HashMap<>(validRecommendation());
        badCategory.put("category", "Not A Real Category");
        assertThat(rest.exchange("/api/recommendations", HttpMethod.POST, body(badCategory, "citizen"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // --- reading (scoping) -----------------------------------------

    @Test
    void citizenSeesOnlyTheirOwnRecommendations() {
        long mine = submitAsCitizen();

        Map<String, Object>[] list = rest.exchange("/api/recommendations", HttpMethod.GET,
                new HttpEntity<>(new HttpHeaders(SessionLogin.cookieFor(rest, "citizen"))),
                Map[].class).getBody();

        assertThat(ids(list)).contains(String.valueOf(mine));
        assertThat(ids(list)).doesNotContain(String.valueOf(otherUsersRecommendationId));
    }

    @Test
    void authoritySeesEveryRecommendation() {
        long citizenRecommendation = submitAsCitizen();

        Map<String, Object>[] list = rest.exchange("/api/recommendations", HttpMethod.GET,
                new HttpEntity<>(new HttpHeaders(SessionLogin.cookieFor(rest, "auditor"))),
                Map[].class).getBody();

        assertThat(ids(list))
                .contains(String.valueOf(citizenRecommendation), String.valueOf(otherUsersRecommendationId));
    }

    // --- acting -----------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void mosPiCanAdvanceStatusAndRecordAnActionNote() {
        long id = submitAsCitizen();

        ResponseEntity<Map> response = rest.exchange("/api/recommendations/" + id, HttpMethod.PATCH,
                body(Map.of("status", "RECOMMENDED", "actionNote", "Endorsed by the local MP office"),
                        "mospi"),
                Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("RECOMMENDED");
        assertThat(response.getBody().get("actionNote")).isEqualTo("Endorsed by the local MP office");
    }

    @Test
    void citizenAndAuditorCannotPatchARecommendation() {
        long id = submitAsCitizen();
        for (String role : new String[] {"citizen", "auditor", "mp"}) {
            assertThat(rest.exchange("/api/recommendations/" + id, HttpMethod.PATCH,
                    body(Map.of("status", "REJECTED"), role), String.class).getStatusCode())
                    .as(role).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void patchingAnUnknownRecommendationIs404() {
        assertThat(rest.exchange("/api/recommendations/99999999", HttpMethod.PATCH,
                body(Map.of("status", "REJECTED"), "mospi"), String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    private static String[] ids(Map<String, Object>[] list) {
        return Arrays.stream(list).map(r -> (String) r.get("id")).toArray(String[]::new);
    }
}
