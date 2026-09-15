package com.mpladsentinel.notification;

import jakarta.validation.constraints.NotNull;

/**
 * Body of {@code POST /api/notifications/send-notice} — an authority flagging a
 * specific work as needing the District Authority's attention.
 */
public record SendNoticeRequest(@NotNull Long sourceWorkId) {
}
