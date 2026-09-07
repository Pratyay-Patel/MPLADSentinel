package com.mpladsentinel.inspection;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.auth.AppUserRepository;
import com.mpladsentinel.auth.WebRole;

/** Read side for the seeded field-officer accounts (the assignment dropdown). */
@Service
@Transactional(readOnly = true)
public class FieldOfficerService {

    private final AppUserRepository users;

    public FieldOfficerService(AppUserRepository users) {
        this.users = users;
    }

    /** Enabled field officers, ordered by officer code. */
    public List<FieldOfficerResponse> listOfficers() {
        return users.findByRoleOrderByOfficerCodeAsc(WebRole.FIELD_OFFICER).stream()
                .filter(user -> user.isEnabled() && user.getOfficerCode() != null)
                .map(FieldOfficerResponse::from)
                .toList();
    }
}
