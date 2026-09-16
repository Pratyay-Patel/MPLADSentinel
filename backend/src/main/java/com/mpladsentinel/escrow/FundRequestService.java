package com.mpladsentinel.escrow;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
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
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.mplads.risk.RiskAssessment;
import com.mpladsentinel.mplads.risk.RiskEngine;

/**
 * Escrow & Fund Control workflow: a District Officer requests an installment
 * for a work; {@link FundEligibilityEngine} decides APPROVED/REJECTED
 * immediately; MoSPI/Ministry can then send a release notice on an approved
 * request. Every request keeps a permanent, append-only history
 * ({@link FundRequestEvent}) — rejected requests are never hidden or deleted.
 *
 * <p>Deliberately NOT implemented (see the feature spec): Hyperledger Fabric,
 * chaincode, smart contracts, wallets, cryptocurrency, bank APIs, or any real
 * INR transfer. PostgreSQL is the sole source of truth for this phase.
 */
@Service
@Transactional
public class FundRequestService {

    private final FundRequestRepository requests;
    private final FundRequestEventRepository events;
    private final AppUserRepository users;
    private final WorkRepository works;
    private final RiskEngine riskEngine;
    private final FundEligibilityEngine eligibilityEngine;

    public FundRequestService(FundRequestRepository requests, FundRequestEventRepository events,
                              AppUserRepository users, WorkRepository works, RiskEngine riskEngine,
                              FundEligibilityEngine eligibilityEngine) {
        this.requests = requests;
        this.events = events;
        this.users = users;
        this.works = works;
        this.riskEngine = riskEngine;
        this.eligibilityEngine = eligibilityEngine;
    }

    // --- create -----------------------------------------------------------

    /** District Officer only. Decides APPROVED/REJECTED immediately — see {@link FundEligibilityEngine}. */
    public FundRequestResponse create(CreateFundRequestRequest request, Long requestedByUserId) {
        Work work = works.findFirstBySourceWorkIdOrderByIdAsc(request.sourceWorkId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No work with source id " + request.sourceWorkId()));

        FundRequest fundRequest = new FundRequest(work.getSourceWorkId(), requestedByUserId,
                request.requestedAmount(), trimToNull(request.remarks()));

        FundEligibilityEngine.Decision decision = eligibilityEngine.evaluate(work, request.requestedAmount());
        fundRequest.decide(decision.status(), decision.reason(), Instant.now());
        fundRequest = requests.save(fundRequest);

        events.save(new FundRequestEvent(fundRequest.getId(), FundRequestEventType.CREATED, requestedByUserId,
                "Requested ₹" + request.requestedAmount().toPlainString()
                        + (fundRequest.getRemarks() != null ? " — " + fundRequest.getRemarks() : "")));
        events.save(new FundRequestEvent(fundRequest.getId(),
                decision.status() == FundRequestStatus.APPROVED
                        ? FundRequestEventType.APPROVED : FundRequestEventType.REJECTED,
                null, decision.reason()));

        return single(fundRequest);
    }

    // --- read ---------------------------------------------------------

    /** Every fund request, newest first. MoSPI only (District sees {@link #listOwnedBy}). */
    @Transactional(readOnly = true)
    public List<FundRequestResponse> listAll() {
        return toResponses(requests.findAllByOrderByCreatedAtDesc());
    }

    /** Fund requests raised by one District Officer, newest first. */
    @Transactional(readOnly = true)
    public List<FundRequestResponse> listOwnedBy(Long userId) {
        return toResponses(requests.findByRequestedByUserIdOrderByCreatedAtDesc(userId));
    }

    @Transactional(readOnly = true)
    public Optional<FundRequestResponse> get(long id) {
        return requests.findById(id).map(this::single);
    }

    // --- release notice --------------------------------------------------

    /**
     * MoSPI records that the (already-approved) installment was notified to
     * the bank for release — a database flag only, never a real bank call.
     */
    public Optional<FundRequestResponse> sendReleaseNotice(long id, Long byUserId) {
        return requests.findById(id).map(fundRequest -> {
            if (fundRequest.getStatus() != FundRequestStatus.APPROVED) {
                throw new ReleaseNoticeException(
                        "Only an APPROVED request can have a release notice sent.");
            }
            if (fundRequest.isReleaseNoticeSent()) {
                throw new ReleaseNoticeException(
                        "The release notice for this request has already been sent.");
            }
            fundRequest.markReleaseNoticeSent(byUserId, Instant.now());
            fundRequest.touchUpdatedAt();
            FundRequest saved = requests.save(fundRequest);
            events.save(new FundRequestEvent(saved.getId(), FundRequestEventType.RELEASE_NOTICE_SENT, byUserId,
                    "Release notice recorded for the bank. No actual bank transaction was performed."));
            return single(saved);
        });
    }

    // --- mapping -----------------------------------------------------------

    private FundRequestResponse single(FundRequest row) {
        List<FundRequest> one = List.of(row);
        List<FundRequestEvent> history = events.findByFundRequestIdOrderByOccurredAtAsc(row.getId());
        Map<Long, AppUser> usersById = indexUsers(one, history);
        Work work = indexWorks(one).get(row.getSourceWorkId());
        RiskAssessment risk = work == null ? null : riskEngine.assess(work.getSourceWorkId()).orElse(null);
        return toResponse(row, work, risk, usersById, history);
    }

    private List<FundRequestResponse> toResponses(List<FundRequest> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> ids = rows.stream().map(FundRequest::getId).toList();
        List<FundRequestEvent> allEvents = events.findByFundRequestIdInOrderByOccurredAtAsc(ids);
        Map<Long, List<FundRequestEvent>> eventsByRequest = allEvents.stream().collect(
                Collectors.groupingBy(FundRequestEvent::getFundRequestId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, AppUser> usersById = indexUsers(rows, allEvents);
        Map<Long, Work> worksById = indexWorks(rows);
        Map<Long, RiskAssessment> riskByWorkId = riskEngine.assessAll().stream()
                .collect(Collectors.toMap(RiskAssessment::sourceWorkId, r -> r, (a, b) -> a));

        List<FundRequestResponse> out = new ArrayList<>(rows.size());
        for (FundRequest row : rows) {
            out.add(toResponse(row, worksById.get(row.getSourceWorkId()), riskByWorkId.get(row.getSourceWorkId()),
                    usersById, eventsByRequest.getOrDefault(row.getId(), List.of())));
        }
        return out;
    }

    private Map<Long, AppUser> indexUsers(List<FundRequest> rows, List<FundRequestEvent> relatedEvents) {
        Set<Long> ids = new HashSet<>();
        for (FundRequest row : rows) {
            ids.add(row.getRequestedByUserId());
            if (row.getReleaseNoticeByUserId() != null) {
                ids.add(row.getReleaseNoticeByUserId());
            }
        }
        for (FundRequestEvent event : relatedEvents) {
            if (event.getActorUserId() != null) {
                ids.add(event.getActorUserId());
            }
        }
        Map<Long, AppUser> byId = new LinkedHashMap<>();
        for (AppUser user : users.findAllById(ids)) {
            byId.put(user.getId(), user);
        }
        return byId;
    }

    private Map<Long, Work> indexWorks(List<FundRequest> rows) {
        Set<Long> workIds = rows.stream().map(FundRequest::getSourceWorkId)
                .collect(Collectors.toCollection(HashSet::new));
        Map<Long, Work> byId = new LinkedHashMap<>();
        for (Work work : works.findBySourceWorkIdIn(workIds)) {
            byId.putIfAbsent(work.getSourceWorkId(), work);
        }
        return byId;
    }

    private static FundRequestResponse toResponse(FundRequest row, Work work, RiskAssessment risk,
                                                  Map<Long, AppUser> usersById, List<FundRequestEvent> history) {
        AppUser requestedBy = usersById.get(row.getRequestedByUserId());
        AppUser releaseNoticeBy = row.getReleaseNoticeByUserId() == null ? null
                : usersById.get(row.getReleaseNoticeByUserId());

        BigDecimal sanctioned = work == null ? null : work.getEstimatedCost();
        BigDecimal alreadyReleased = work == null ? null : FundEligibilityEngine.alreadyReleased(work);
        BigDecimal remainingBefore = work == null ? null : FundEligibilityEngine.remaining(work);
        BigDecimal remainingAfter = remainingBefore == null ? null
                : remainingBefore.subtract(row.getRequestedAmount());

        List<FundRequestEventResponse> historyResponses = history.stream()
                .map(event -> new FundRequestEventResponse(
                        event.getEventType(),
                        event.getOccurredAt(),
                        actorName(event.getActorUserId(), usersById),
                        event.getDetail()))
                .toList();

        return new FundRequestResponse(
                String.valueOf(row.getId()),
                row.getSourceWorkId(),
                work == null ? "Work #" + row.getSourceWorkId() : workTitle(work),
                work == null ? null : work.getDistrict(),
                requestedBy != null ? requestedBy.getUsername() : null,
                requestedBy != null ? requestedBy.getDisplayName() : null,
                row.getRequestedAmount(),
                row.getRemarks(),
                row.getCreatedAt(),
                sanctioned,
                alreadyReleased,
                remainingBefore,
                remainingAfter,
                risk != null ? risk.level() : null,
                risk != null ? risk.reasons() : List.of(),
                row.getStatus(),
                row.getDecisionReason(),
                row.getDecidedAt(),
                row.isReleaseNoticeSent(),
                releaseNoticeBy != null ? releaseNoticeBy.getDisplayName() : null,
                row.getReleaseNoticeAt(),
                row.getUpdatedAt(),
                historyResponses);
    }

    private static String actorName(Long actorUserId, Map<Long, AppUser> usersById) {
        if (actorUserId == null) {
            return null;
        }
        AppUser actor = usersById.get(actorUserId);
        return actor != null ? actor.getDisplayName() : null;
    }

    private static String workTitle(Work work) {
        String description = work.getWorkDescription();
        if (StringUtils.hasText(description)) {
            String trimmed = description.strip();
            return trimmed.length() <= 120 ? trimmed : trimmed.substring(0, 117) + "…";
        }
        return "Work #" + work.getSourceWorkId();
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
