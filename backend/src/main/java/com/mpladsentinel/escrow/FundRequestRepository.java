package com.mpladsentinel.escrow;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FundRequestRepository extends JpaRepository<FundRequest, Long> {

    List<FundRequest> findAllByOrderByCreatedAtDesc();

    List<FundRequest> findByRequestedByUserIdOrderByCreatedAtDesc(Long requestedByUserId);
}
