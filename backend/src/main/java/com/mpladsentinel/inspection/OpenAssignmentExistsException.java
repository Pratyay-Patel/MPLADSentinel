package com.mpladsentinel.inspection;

/**
 * Thrown when an authority tries to assign a work to a field officer who already
 * has an open ({@code ASSIGNED} / {@code IN_PROGRESS}) assignment for that same
 * work. Surfaced as HTTP {@code 409 Conflict}.
 */
public class OpenAssignmentExistsException extends RuntimeException {

    public OpenAssignmentExistsException(String message) {
        super(message);
    }
}
