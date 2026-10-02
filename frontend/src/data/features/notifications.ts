import type { DataProvider } from '../DataProvider';
import type { AppNotification } from '../types';

/**
 * Feature service for the header notification bell and the "Send Notice"
 * action on high-risk / attention-needing works.
 */
export interface NotificationsService {
  load(signal?: AbortSignal): Promise<AppNotification[]>;
  markRead(id: string, signal?: AbortSignal): Promise<AppNotification>;
  markAllRead(signal?: AbortSignal): Promise<void>;
  /** "Clear all" — hides the list from the bell; the backend keeps the records. */
  clearAll(signal?: AbortSignal): Promise<void>;
  sendSlaNotice(sourceWorkId: number, signal?: AbortSignal): Promise<void>;
}

export function createNotificationsService(provider: DataProvider): NotificationsService {
  return {
    load: (signal) => provider.listNotifications(signal),
    markRead: (id, signal) => provider.markNotificationRead(id, signal),
    markAllRead: (signal) => provider.markAllNotificationsRead(signal),
    clearAll: (signal) => provider.clearAllNotifications(signal),
    sendSlaNotice: (sourceWorkId, signal) => provider.sendSlaNotice(sourceWorkId, signal),
  };
}
