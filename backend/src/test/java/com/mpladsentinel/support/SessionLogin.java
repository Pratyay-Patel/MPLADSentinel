package com.mpladsentinel.support;

import java.util.List;
import java.util.Map;

import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * Test helper: logs in through {@code POST /api/auth/login} with a seeded demo
 * account and returns headers carrying the resulting {@code JSESSIONID} cookie,
 * ready to attach to follow-up requests.
 */
public final class SessionLogin {

    /** The {@code application.yml} default seed password (tests do not override it). */
    public static final String SEED_PASSWORD = "Demo@12345";

    private SessionLogin() {
    }

    public static HttpHeaders cookieFor(TestRestTemplate rest, String username) {
        HttpHeaders json = new HttpHeaders();
        json.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> response = rest.exchange(
                "/api/auth/login", HttpMethod.POST,
                new HttpEntity<>(Map.of("username", username, "password", SEED_PASSWORD), json),
                String.class);
        if (response.getStatusCode() != HttpStatus.OK) {
            throw new IllegalStateException(
                    "login failed for '" + username + "': " + response.getStatusCode());
        }

        List<String> setCookie = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        String session = setCookie == null ? null : setCookie.stream()
                .filter(value -> value.startsWith("JSESSIONID="))
                .map(value -> value.split(";", 2)[0])
                .findFirst()
                .orElse(null);
        if (session == null) {
            throw new IllegalStateException("no JSESSIONID returned for '" + username + "'");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, session);
        return headers;
    }
}
