package com.mpladsentinel.auth;

/** Thrown by {@link AuthService#register} when the email is already in use (→ HTTP 409). */
public class EmailAlreadyRegisteredException extends RuntimeException {

    public EmailAlreadyRegisteredException() {
        super("That email is already registered.");
    }
}
