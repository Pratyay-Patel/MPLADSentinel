package com.mpladsentinel.inspection;

import com.mpladsentinel.auth.AppUser;

/**
 * A field officer as offered to the "assign an inspection" dropdown
 * ({@code GET /api/officers}). Only the fields the authority UI needs — no
 * account internals.
 */
public record FieldOfficerResponse(String officerCode, String name, String phone) {

    static FieldOfficerResponse from(AppUser user) {
        return new FieldOfficerResponse(user.getOfficerCode(), user.getDisplayName(), user.getPhone());
    }
}
