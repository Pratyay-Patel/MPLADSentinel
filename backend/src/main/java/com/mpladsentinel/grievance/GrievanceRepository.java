package com.mpladsentinel.grievance;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link Grievance}. */
public interface GrievanceRepository extends JpaRepository<Grievance, Long> {

    List<Grievance> findAllByOrderBySubmittedAtDesc();

    List<Grievance> findBySubmittedByUserIdOrderBySubmittedAtDesc(Long submittedByUserId);
}
