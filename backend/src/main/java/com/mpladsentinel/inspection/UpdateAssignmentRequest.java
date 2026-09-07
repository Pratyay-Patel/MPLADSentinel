package com.mpladsentinel.inspection;

import java.time.LocalDate;

import jakarta.validation.constraints.Size;

/**
 * Body of {@code PATCH /api/assignments/{id}}. Every field is optional; a
 * non-null value is applied, {@code null} leaves that field unchanged.
 *
 * <ul>
 *   <li>{@code status} — advance the lifecycle
 *       ({@code ASSIGNED -> IN_PROGRESS -> COMPLETED}) or {@code CANCELLED} from
 *       an open state. An illegal transition is rejected with {@code 400}.</li>
 *   <li>{@code dueDate} / {@code note} — edit the assignment.</li>
 * </ul>
 */
public record UpdateAssignmentRequest(

        AssignmentStatus status,

        LocalDate dueDate,

        @Size(max = 2000) String note
) {
}
