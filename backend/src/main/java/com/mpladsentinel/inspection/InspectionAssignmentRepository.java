package com.mpladsentinel.inspection;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link InspectionAssignment}. */
public interface InspectionAssignmentRepository extends JpaRepository<InspectionAssignment, Long> {

    List<InspectionAssignment> findAllByOrderByAssignedAtDesc();

    List<InspectionAssignment> findBySourceWorkIdOrderByAssignedAtDesc(Long sourceWorkId);

    List<InspectionAssignment> findByOfficerIdOrderByAssignedAtDesc(Long officerId);

    List<InspectionAssignment> findByStatusOrderByAssignedAtDesc(AssignmentStatus status);

    /** An existing open ({@code ASSIGNED} / {@code IN_PROGRESS}) assignment for this work + officer, if any. */
    Optional<InspectionAssignment> findFirstBySourceWorkIdAndOfficerIdAndStatusIn(
            Long sourceWorkId, Long officerId, List<AssignmentStatus> statuses);
}
