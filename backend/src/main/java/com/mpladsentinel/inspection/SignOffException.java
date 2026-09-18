package com.mpladsentinel.inspection;

/**
 * Thrown when a dual-authority sign-off request or confirmation is invalid:
 * no sign-off is pending, one is already pending, or the confirming authority
 * is the same {@code app_user} who requested it (the core anti-corruption
 * check — a second, different authority must confirm). Surfaced as HTTP
 * {@code 409 Conflict}.
 */
public class SignOffException extends RuntimeException {

    public SignOffException(String message) {
        super(message);
    }
}
