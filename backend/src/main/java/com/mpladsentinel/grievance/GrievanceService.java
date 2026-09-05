package com.mpladsentinel.grievance;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.mpladsentinel.common.web.PageResponse;
import com.mpladsentinel.common.web.PaginationRequest;

/**
 * Grievance workflow: a citizen raises one, MoSPI / State / District move it
 * through {@link GrievanceStatus}. Read visibility is caller-scoped — a citizen
 * sees only their own, every other role sees all.
 */
@Service
@Transactional
public class GrievanceService {

    /** Must match {@code ck_grievance_category} (V6) and the frontend list. */
    static final Set<String> CATEGORIES = Set.of(
            "Quality of work", "Delay in execution", "Work not started",
            "Suspected misuse of funds", "Wrong location or beneficiary", "Other");

    private final GrievanceRepository grievances;

    public GrievanceService(GrievanceRepository grievances) {
        this.grievances = grievances;
    }

    /** All grievances, newest first. */
    @Transactional(readOnly = true)
    public PageResponse<GrievanceResponse> listAll(PaginationRequest pagination) {
        List<GrievanceResponse> rows = grievances.findAllByOrderBySubmittedAtDesc().stream()
                .map(GrievanceResponse::from).toList();
        return PageResponse.of(rows, pagination.page(), pagination.size());
    }

    /** Grievances raised by one user, newest first. */
    @Transactional(readOnly = true)
    public PageResponse<GrievanceResponse> listOwnedBy(Long userId, PaginationRequest pagination) {
        List<GrievanceResponse> rows = grievances.findBySubmittedByUserIdOrderBySubmittedAtDesc(userId).stream()
                .map(GrievanceResponse::from).toList();
        return PageResponse.of(rows, pagination.page(), pagination.size());
    }

    /** Record a new grievance for {@code submitterUserId}. */
    public GrievanceResponse create(CreateGrievanceRequest request, Long submitterUserId) {
        if (!CATEGORIES.contains(request.category())) {
            throw new IllegalArgumentException("Unknown grievance category: " + request.category());
        }
        Grievance grievance = new Grievance(
                request.category(), request.subject().trim(), request.description().trim());
        grievance.setWorkReference(request.workReference());
        grievance.setContactName(trimToNull(request.contactName()));
        grievance.setContactEmail(trimToNull(request.contactEmail()));
        grievance.setSubmittedByUserId(submitterUserId);
        grievance.setStatus(GrievanceStatus.SUBMITTED);
        return GrievanceResponse.from(grievances.save(grievance));
    }

    /**
     * Apply a status + action-note change. Empty {@link Optional} means no
     * grievance has that id.
     */
    public Optional<GrievanceResponse> updateStatus(long id, UpdateGrievanceStatusRequest request) {
        return grievances.findById(id).map(grievance -> {
            grievance.setStatus(request.status());
            grievance.setActionNote(trimToNull(request.actionNote()));
            grievance.touchUpdatedAt();
            return GrievanceResponse.from(grievances.save(grievance));
        });
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
