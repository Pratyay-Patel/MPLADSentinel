package com.mpladsentinel.notification;

/**
 * What triggered a {@link Notification}. Matches {@code ck_notification_category}
 * (migration V11) and the frontend {@code NotificationCategory} union.
 */
public enum NotificationCategory {
    /** A real HIGH-risk work, seeded from the rule-based {@code RiskEngine} (D22). */
    HIGH_RISK_WORK,
    /** An authority's explicit "Send Notice" action on an attention-needing work. */
    SLA_NOTICE
}
