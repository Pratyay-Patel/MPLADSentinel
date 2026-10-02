package com.mpladsentinel.notification;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link Notification}. */
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientUserIdAndDismissedFalseOrderByCreatedAtDesc(Long recipientUserId);

    List<Notification> findByRecipientUserIdAndReadFalseAndDismissedFalse(Long recipientUserId);

    long countByRecipientUserIdAndCategory(Long recipientUserId, NotificationCategory category);
}
