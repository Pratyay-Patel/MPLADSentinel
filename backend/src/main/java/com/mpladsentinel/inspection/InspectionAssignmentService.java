package com.mpladsentinel.inspection;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.mpladsentinel.auth.AppUser;
import com.mpladsentinel.auth.AppUserRepository;
import com.mpladsentinel.auth.WebRole;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;

/**
 * Workflow for authority-requested field inspections: an authority
 * ({@code MOSPI} / {@code STATE} / {@code DISTRICT}) assigns a work to a field
 * officer, then advances the assignment through
 * {@link AssignmentStatus#ASSIGNED} → {@code IN_PROGRESS} → {@code COMPLETED}
 * (or {@code CANCELLED}). Persistence only — no mobile / IPFS concerns here.
 */
@Service
@Transactional
public class InspectionAssignmentService {

    private static final List<AssignmentStatus> OPEN_STATUSES =
            List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS);

    private final InspectionAssignmentRepository assignments;
    private final AppUserRepository users;
    private final WorkRepository works;

    public InspectionAssignmentService(InspectionAssignmentRepository assignments,
                                       AppUserRepository users,
                                       WorkRepository works) {
        this.assignments = assignments;
        this.users = users;
        this.works = works;
    }

    // --- create ---------------------------------------------------------

    public AssignmentResponse create(CreateAssignmentRequest request, Long assignedByUserId) {
        AppUser officer = users.findByOfficerCode(request.officerCode().trim())
                .filter(user -> user.getRole() == WebRole.FIELD_OFFICER && user.isEnabled())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown or disabled field officer: " + request.officerCode()));

        Work work = works.findFirstBySourceWorkIdOrderByIdAsc(request.sourceWorkId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No work with source id " + request.sourceWorkId()));

        assignments.findFirstBySourceWorkIdAndOfficerIdAndStatusIn(
                        work.getSourceWorkId(), officer.getId(), OPEN_STATUSES)
                .ifPresent(existing -> {
                    throw new OpenAssignmentExistsException("Officer " + officer.getOfficerCode()
                            + " already has an open assignment for work " + work.getSourceWorkId());
                });

        InspectionAssignment assignment =
                new InspectionAssignment(work.getSourceWorkId(), officer.getId(), assignedByUserId);
        assignment.setDueDate(request.dueDate());
        assignment.setNote(trimToNull(request.note()));
        return single(assignments.save(assignment));
    }

    // --- read ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AssignmentResponse> list(AssignmentStatus status, String officerCode, Long sourceWorkId) {
        Long officerId = officerCode == null ? null
                : users.findByOfficerCode(officerCode.trim()).map(AppUser::getId).orElse(-1L);

        List<InspectionAssignment> rows = assignments.findAllByOrderByAssignedAtDesc().stream()
                .filter(row -> status == null || row.getStatus() == status)
                .filter(row -> officerId == null || officerId.equals(row.getOfficerId()))
                .filter(row -> sourceWorkId == null || sourceWorkId.equals(row.getSourceWorkId()))
                .toList();
        return toResponses(rows);
    }

    @Transactional(readOnly = true)
    public Optional<AssignmentResponse> get(long id) {
        return assignments.findById(id).map(this::single);
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> listForWork(Long sourceWorkId) {
        return toResponses(assignments.findBySourceWorkIdOrderByAssignedAtDesc(sourceWorkId));
    }

    // --- update ---------------------------------------------------------

    public Optional<AssignmentResponse> update(long id, UpdateAssignmentRequest request) {
        return assignments.findById(id).map(assignment -> {
            if (request.status() != null && request.status() != assignment.getStatus()) {
                if (!assignment.getStatus().canTransitionTo(request.status())) {
                    throw new IllegalArgumentException("Cannot move an assignment from "
                            + assignment.getStatus() + " to " + request.status());
                }
                assignment.setStatus(request.status());
            }
            if (request.dueDate() != null) {
                assignment.setDueDate(request.dueDate());
            }
            if (request.note() != null) {
                assignment.setNote(trimToNull(request.note()));
            }
            assignment.touchUpdatedAt();
            return single(assignments.save(assignment));
        });
    }

    // --- mapping ---------------------------------------------------------

    private AssignmentResponse single(InspectionAssignment row) {
        List<InspectionAssignment> one = List.of(row);
        return toResponse(row, indexUsers(one), workTitles(one));
    }

    private List<AssignmentResponse> toResponses(List<InspectionAssignment> rows) {
        Map<Long, AppUser> usersById = indexUsers(rows);
        Map<Long, String> titles = workTitles(rows);
        return rows.stream().map(row -> toResponse(row, usersById, titles)).toList();
    }

    private Map<Long, AppUser> indexUsers(List<InspectionAssignment> rows) {
        Set<Long> ids = new HashSet<>();
        for (InspectionAssignment row : rows) {
            ids.add(row.getOfficerId());
            ids.add(row.getAssignedByUserId());
        }
        Map<Long, AppUser> byId = new LinkedHashMap<>();
        for (AppUser user : users.findAllById(ids)) {
            byId.put(user.getId(), user);
        }
        return byId;
    }

    private Map<Long, String> workTitles(List<InspectionAssignment> rows) {
        Set<Long> workIds = rows.stream().map(InspectionAssignment::getSourceWorkId)
                .collect(Collectors.toCollection(HashSet::new));
        Map<Long, String> titles = new LinkedHashMap<>();
        for (Work work : works.findBySourceWorkIdIn(workIds)) {
            titles.putIfAbsent(work.getSourceWorkId(), workTitle(work));
        }
        return titles;
    }

    private static String workTitle(Work work) {
        String description = work.getWorkDescription();
        if (StringUtils.hasText(description)) {
            String trimmed = description.strip();
            return trimmed.length() <= 120 ? trimmed : trimmed.substring(0, 117) + "…";
        }
        return "Work #" + work.getSourceWorkId();
    }

    private static AssignmentResponse toResponse(InspectionAssignment row,
                                                 Map<Long, AppUser> usersById,
                                                 Map<Long, String> titles) {
        AppUser officer = usersById.get(row.getOfficerId());
        AppUser assignedBy = usersById.get(row.getAssignedByUserId());
        return new AssignmentResponse(
                String.valueOf(row.getId()),
                row.getSourceWorkId(),
                titles.getOrDefault(row.getSourceWorkId(), "Work #" + row.getSourceWorkId()),
                officer != null ? officer.getOfficerCode() : null,
                officer != null ? officer.getDisplayName() : null,
                assignedBy != null ? assignedBy.getDisplayName() : null,
                row.getStatus(),
                row.getDueDate(),
                row.getNote(),
                row.getAssignedAt(),
                row.getUpdatedAt());
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
