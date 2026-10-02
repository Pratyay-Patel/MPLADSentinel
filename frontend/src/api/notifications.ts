import type { AppNotification } from '../data/types';
import { apiClient } from './client';

/**
 * Backend calls for the notification API (header bell + "Send Notice").
 * Response JSON matches the `AppNotification` domain type (`id` is a string on
 * both sides); `ApiDataProvider` owns error mapping.
 *
 * RBAC is server-enforced: every endpoint here needs a signed-in session, and
 * `send-notice` additionally needs an authority role.
 */
export const getNotifications = (signal?: AbortSignal): Promise<AppNotification[]> =>
  apiClient.get('/notifications', { signal });

export const markNotificationRead = (
  id: string,
  signal?: AbortSignal,
): Promise<AppNotification> => apiClient.post(`/notifications/${id}/read`, undefined, { signal });

export const markAllNotificationsRead = (signal?: AbortSignal): Promise<void> =>
  apiClient.post('/notifications/mark-all-read', undefined, { signal });

export const clearAllNotifications = (signal?: AbortSignal): Promise<void> =>
  apiClient.post('/notifications/clear', undefined, { signal });

export const sendSlaNotice = (sourceWorkId: number, signal?: AbortSignal): Promise<void> =>
  apiClient.post('/notifications/send-notice', { sourceWorkId }, { signal }).then(() => undefined);
