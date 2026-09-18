package com.mpladsentinel.notification;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.mpladsentinel.auth.AppUser;
import com.mpladsentinel.auth.AppUserRepository;
import com.mpladsentinel.auth.WebRole;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.mplads.risk.RiskAssessment;
import com.mpladsentinel.mplads.risk.RiskEngine;
import com.mpladsentinel.mplads.risk.RiskLevel;

/**
 * Notification feed for the header bell, plus the "Send Notice" action for
 * high-risk / attention-needing works.
 *
 * <p>Two ways a row is created — see migration V11's comment:
 * <ul>
 *   <li>{@link #sendSlaNotice} — an authority's explicit action, always
 *       addressed to the single seeded District Authority account;</li>
 *   <li>{@link #seedHighRiskAlertsIfNeeded} — a one-time, per-recipient bootstrap
 *       that turns the existing rule-based {@link RiskEngine} (D22) output into
 *       real notifications, so the feed isn't empty on first use. It never
 *       re-seeds once a recipient has any {@code HIGH_RISK_WORK} row, so it will
 *       not resurface a work the recipient has already cleared.</li>
 * </ul>
 */
@Service
@Transactional
public class NotificationService {

    /** Caps the one-time bootstrap so it reads as a handful of alerts, not a dump of the whole risk queue. */
    static final int MAX_SEEDED_HIGH_RISK_ALERTS = 5;

    private final NotificationRepository notifications;
    private final AppUserRepository users;
    private final WorkRepository works;
    private final RiskEngine riskEngine;

    public NotificationService(NotificationRepository notifications, AppUserRepository users,
                               WorkRepository works, RiskEngine riskEngine) {
        this.notifications = notifications;
        this.users = users;
        this.works = works;
        this.riskEngine = riskEngine;
    }

    /** Roles the real high-risk-work alert bootstrap applies to — risk is not exposed to
     * citizens (RiskController), and a field officer has no web notification feed. */
    private static final Set<WebRole> RISK_VISIBLE_ROLES =
            Set.of(WebRole.MOSPI, WebRole.STATE, WebRole.DISTRICT, WebRole.AUDITOR, WebRole.MP);

    /** Active (non-dismissed) notifications for one recipient, newest first. */
    public List<NotificationResponse> listFor(Long recipientUserId, WebRole role) {
        if (RISK_VISIBLE_ROLES.contains(role)) {
            seedHighRiskAlertsIfNeeded(recipientUserId);
        }
        return notifications.findByRecipientUserIdAndDismissedFalseOrderByCreatedAtDesc(recipientUserId)
                .stream().map(NotificationResponse::from).toList();
    }

    /** Marks one of the recipient's own notifications read. Empty if it doesn't exist or isn't theirs. */
    public Optional<NotificationResponse> markRead(long id, Long recipientUserId) {
        return notifications.findById(id)
                .filter(n -> n.getRecipientUserId().equals(recipientUserId))
                .map(n -> {
                    n.markRead();
                    return NotificationResponse.from(notifications.save(n));
                });
    }

    /** Marks every active, unread notification of the recipient's read. */
    public void markAllRead(Long recipientUserId) {
        List<Notification> unread = notifications.findByRecipientUserIdAndReadFalseAndDismissedFalse(recipientUserId);
        unread.forEach(Notification::markRead);
        notifications.saveAll(unread);
    }

    /** "Clear all" — dismisses (does not delete) every active notification of the recipient. */
    public void clearAll(Long recipientUserId) {
        List<Notification> active =
                notifications.findByRecipientUserIdAndDismissedFalseOrderByCreatedAtDesc(recipientUserId);
        active.forEach(Notification::dismiss);
        notifications.saveAll(active);
    }

    /**
     * An authority flags a work as needing attention. Always addressed to the
     * single seeded District Authority account (no per-district accounts exist
     * yet — decision D31).
     */
    public NotificationResponse sendSlaNotice(SendNoticeRequest request) {
        Work work = works.findFirstBySourceWorkIdOrderByIdAsc(request.sourceWorkId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No work with source id " + request.sourceWorkId()));

        AppUser district = users.findByRoleOrderByOfficerCodeAsc(WebRole.DISTRICT).stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No District Authority account is seeded."));

        Notification notification = new Notification(
                district.getId(),
                NotificationCategory.SLA_NOTICE,
                "Attention required: " + workTitle(work),
                "This work has been flagged as high-risk / requiring attention and needs your review.",
                work.getSourceWorkId());
        return NotificationResponse.from(notifications.save(notification));
    }

    private void seedHighRiskAlertsIfNeeded(Long recipientUserId) {
        if (notifications.countByRecipientUserIdAndCategory(recipientUserId, NotificationCategory.HIGH_RISK_WORK) > 0) {
            return;
        }
        List<RiskAssessment> highRisk = riskEngine.assessAll().stream()
                .filter(a -> a.level() == RiskLevel.HIGH)
                .limit(MAX_SEEDED_HIGH_RISK_ALERTS)
                .toList();
        if (highRisk.isEmpty()) {
            return;
        }

        List<Long> workIds = highRisk.stream().map(RiskAssessment::sourceWorkId).toList();
        Map<Long, Work> byId = new LinkedHashMap<>();
        for (Work work : works.findBySourceWorkIdIn(workIds)) {
            byId.putIfAbsent(work.getSourceWorkId(), work);
        }

        for (RiskAssessment assessment : highRisk) {
            Work work = byId.get(assessment.sourceWorkId());
            String title = work != null ? workTitle(work) : "Work #" + assessment.sourceWorkId();
            String reasons = String.join("; ", assessment.reasons());
            String message = assessment.score() != null
                    ? "Assessed HIGH risk (score " + assessment.score() + "). " + reasons
                    : "Assessed HIGH risk. " + reasons;
            notifications.save(new Notification(
                    recipientUserId, NotificationCategory.HIGH_RISK_WORK,
                    "High-risk work flagged: " + title, message.strip(), assessment.sourceWorkId()));
        }
    }

    private static String workTitle(Work work) {
        String description = work.getWorkDescription();
        if (StringUtils.hasText(description)) {
            String trimmed = description.strip();
            return trimmed.length() <= 120 ? trimmed : trimmed.substring(0, 117) + "…";
        }
        return "Work #" + work.getSourceWorkId();
    }
}
