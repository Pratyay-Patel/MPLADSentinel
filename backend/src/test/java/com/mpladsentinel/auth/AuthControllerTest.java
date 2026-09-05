package com.mpladsentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.mpladsentinel.support.AbstractPostgresIntegrationTest;

/**
 * End-to-end auth flow through the full HTTP + security filter chain (decision
 * D31): login with a seeded demo account, session-cookie round-trips to
 * {@code /me}, logout, and the failure responses.
 *
 * <p>Relies on {@link AuthUserSeeder} having created the demo accounts at
 * context startup (seeding is enabled by default) with the {@code application.yml}
 * default seed password.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthControllerTest extends AbstractPostgresIntegrationTest {

    private static final String SEED_PASSWORD = "Demo@12345";

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private AppUserRepository userRepository;

    @Test
    void allSixDemoAccountsAreSeeded() {
        for (String username : List.of("mospi", "state", "district", "auditor", "mp", "citizen")) {
            assertThat(userRepository.existsByUsername(username)).as(username).isTrue();
        }
    }

    @Test
    void loginWithSeededAccountReturnsRoleAndSetsSessionCookie() {
        ResponseEntity<SessionUser> response = rest.postForEntity(
                "/api/auth/login", new LoginRequest("mospi", SEED_PASSWORD), SessionUser.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().username()).isEqualTo("mospi");
        assertThat(response.getBody().role()).isEqualTo("MOSPI");
        assertThat(response.getBody().displayName()).contains("MoSPI");
        assertThat(sessionCookie(response)).isNotNull();
    }

    @Test
    void meReturnsCurrentUserWhenSessionCookiePresented() {
        String cookie = login("auditor");

        ResponseEntity<SessionUser> me = rest.exchange(
                "/api/auth/me", HttpMethod.GET, withCookie(cookie), SessionUser.class);

        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody()).isNotNull();
        assertThat(me.getBody().username()).isEqualTo("auditor");
        assertThat(me.getBody().role()).isEqualTo("AUDITOR");
    }

    @Test
    void meIsUnauthorizedWithoutSession() {
        ResponseEntity<String> me = rest.getForEntity("/api/auth/me", String.class);

        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void loginWithWrongPasswordIsUnauthorized() {
        ResponseEntity<String> response = rest.postForEntity(
                "/api/auth/login", new LoginRequest("mospi", "not-the-password"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).contains("Invalid username or password");
    }

    @Test
    void loginWithUnknownUserIsUnauthorized() {
        ResponseEntity<String> response = rest.postForEntity(
                "/api/auth/login", new LoginRequest("nobody", SEED_PASSWORD), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void loginWithBlankFieldsIsBadRequest() {
        ResponseEntity<String> response = rest.postForEntity(
                "/api/auth/login", new LoginRequest("", ""), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void logoutInvalidatesTheSession() {
        String cookie = login("citizen");

        ResponseEntity<Void> logout = rest.exchange(
                "/api/auth/logout", HttpMethod.POST, withCookie(cookie), Void.class);
        assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> me = rest.exchange(
                "/api/auth/me", HttpMethod.GET, withCookie(cookie), String.class);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void healthRemainsPublicAfterAuthIsEnabled() {
        assertThat(rest.getForEntity("/api/health", String.class).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    // --- citizen self-registration (B4a, D32) ---------------------------

    @Test
    void aCitizenCanSelfRegisterIsSignedInAndCanLogInAgain() {
        RegisterRequest req = new RegisterRequest(
                "Jane Citizen", "jane.b4a@example.com", "goodpassword", "goodpassword");

        ResponseEntity<SessionUser> response = rest.postForEntity(
                "/api/auth/register", req, SessionUser.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().role()).isEqualTo("CITIZEN");
        assertThat(response.getBody().username()).isEqualTo("jane.b4a@example.com");
        assertThat(response.getBody().displayName()).isEqualTo("Jane Citizen");
        assertThat(sessionCookie(response)).as("registration establishes a session").isNotNull();

        // and the new account can log in normally with its email
        ResponseEntity<SessionUser> login = rest.postForEntity("/api/auth/login",
                new LoginRequest("jane.b4a@example.com", "goodpassword"), SessionUser.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(login.getBody().role()).isEqualTo("CITIZEN");
    }

    @Test
    void registrationCannotForceAPrivilegedRole() {
        Map<String, Object> body = new HashMap<>();
        body.put("displayName", "Sneaky");
        body.put("email", "sneaky.b4a@example.com");
        body.put("password", "goodpassword");
        body.put("passwordConfirm", "goodpassword");
        body.put("role", "MOSPI"); // ignored — role is server-assigned

        ResponseEntity<SessionUser> response = rest.postForEntity(
                "/api/auth/register", body, SessionUser.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().role()).isEqualTo("CITIZEN");
    }

    @Test
    void registeringAnAlreadyUsedEmailIsConflict() {
        RegisterRequest req = new RegisterRequest(
                "First", "dupe.b4a@example.com", "goodpassword", "goodpassword");
        assertThat(rest.postForEntity("/api/auth/register", req, String.class).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);

        RegisterRequest again = new RegisterRequest(
                "Second", "DUPE.b4a@example.com", "otherpassword", "otherpassword");
        assertThat(rest.postForEntity("/api/auth/register", again, String.class).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void rejectsMismatchedPasswordsShortPasswordsAndBadEmails() {
        assertThat(rest.postForEntity("/api/auth/register",
                new RegisterRequest("A", "mismatch.b4a@example.com", "goodpassword", "different"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(rest.postForEntity("/api/auth/register",
                new RegisterRequest("A", "short.b4a@example.com", "short", "short"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(rest.postForEntity("/api/auth/register",
                new RegisterRequest("A", "not-an-email", "goodpassword", "goodpassword"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(rest.postForEntity("/api/auth/register",
                new RegisterRequest("", "blankname.b4a@example.com", "goodpassword", "goodpassword"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // --- helpers -----------------------------------------------------------

    private String login(String username) {
        ResponseEntity<SessionUser> response = rest.postForEntity(
                "/api/auth/login", new LoginRequest(username, SEED_PASSWORD), SessionUser.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        String cookie = sessionCookie(response);
        assertThat(cookie).as("session cookie from login").isNotNull();
        return cookie;
    }

    private static String sessionCookie(ResponseEntity<?> response) {
        List<String> setCookie = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        if (setCookie == null) {
            return null;
        }
        return setCookie.stream()
                .filter(value -> value.startsWith("JSESSIONID="))
                .map(value -> value.split(";", 2)[0])
                .findFirst()
                .orElse(null);
    }

    private static HttpEntity<Void> withCookie(String cookie) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, cookie);
        return new HttpEntity<>(headers);
    }
}
