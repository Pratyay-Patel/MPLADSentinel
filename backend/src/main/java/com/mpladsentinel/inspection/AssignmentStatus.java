package com.mpladsentinel.inspection;

/**
 * Lifecycle of an {@link InspectionAssignment}.
 *
 * <p>{@code ASSIGNED -> IN_PROGRESS -> COMPLETED}, with {@code CANCELLED}
 * reachable from either open state. The names match the parent contract
 * ({@code docs/portal-app-integration-plan.md}) so the deferred Flutter channel
 * attaches without a rename; the web UI labels them
 * "Requested / In progress / Completed / Cancelled".
 */
public enum AssignmentStatus {

    /** Requested by an authority; the officer has not started. */
    ASSIGNED,

    /** The officer has started the on-site inspection. */
    IN_PROGRESS,

    /** An inspection has been recorded against this assignment. */
    COMPLETED,

    /** Withdrawn by an authority before completion. */
    CANCELLED;

    /** {@code true} while the assignment can still change (not COMPLETED / CANCELLED). */
    public boolean isOpen() {
        return this == ASSIGNED || this == IN_PROGRESS;
    }

    /** {@code true} when moving to {@code target} is a permitted transition from this state. */
    public boolean canTransitionTo(AssignmentStatus target) {
        return switch (this) {
            case ASSIGNED -> target == IN_PROGRESS || target == COMPLETED || target == CANCELLED;
            case IN_PROGRESS -> target == COMPLETED || target == CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}
