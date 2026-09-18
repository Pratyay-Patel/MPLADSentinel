package com.mpladsentinel.escrow;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FundRequestEventRepository extends JpaRepository<FundRequestEvent, Long> {

    List<FundRequestEvent> findByFundRequestIdOrderByOccurredAtAsc(Long fundRequestId);

    List<FundRequestEvent> findByFundRequestIdInOrderByOccurredAtAsc(Collection<Long> fundRequestIds);
}
