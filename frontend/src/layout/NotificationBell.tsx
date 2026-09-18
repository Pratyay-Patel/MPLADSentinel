import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useSession } from '../auth';
import { type AppNotification, useNotificationsService } from '../data';
import { formatDate } from '../format';
import { BellIcon } from '../ui/icons';

/**
 * Header notification bell: unread badge + a dropdown of the signed-in user's
 * notifications (real high-risk-work alerts and "Send Notice" actions — see
 * `NotificationsService` / the backend `notification` table, migration V11).
 *
 * Mounted once in {@link ../layout/AppHeader.AppHeader}, so it persists across
 * client-side navigation — it re-loads when the signed-in role changes (a demo
 * persona switch does not remount the shell) and lazily on open, so it stays
 * reasonably fresh without polling.
 */
export function NotificationBell() {
  const { role } = useSession();
  const service = useNotificationsService();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const list = await service.load(signal);
        if (!signal?.aborted) {
          setNotifications(list);
        }
      } catch {
        // A header widget stays quiet on failure — the bell just shows what it last had.
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [service],
  );

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload, role]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await service.markRead(id);
    } catch {
      void reload();
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await service.markAllRead();
    } catch {
      setNotifications(previous);
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    setBusy(true);
    const previous = notifications;
    setNotifications([]);
    try {
      await service.clearAll();
    } catch {
      setNotifications(previous);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="notif-bell__btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="notif-bell__badge" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="notif-bell__panel" role="dialog" aria-label="Notifications">
          <div className="notif-bell__head">
            <span className="notif-bell__title">Notifications</span>
            {unreadCount > 0 ? (
              <span className="notif-bell__count">{unreadCount} unread</span>
            ) : null}
          </div>

          <div className="notif-bell__list">
            {loading ? (
              <p className="notif-bell__empty">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="notif-bell__empty">No notifications.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="notif-item" data-unread={!n.read || undefined}>
                  <span className="notif-item__dot" aria-hidden />
                  <div className="notif-item__body">
                    <p className="notif-item__title">{n.title}</p>
                    <p className="notif-item__message">{n.message}</p>
                    <div className="notif-item__meta">
                      <span className="notif-item__date">{formatDate(n.createdAt)}</span>
                      {n.sourceWorkId != null ? (
                        <Link
                          className="notif-item__link"
                          to={`/projects/${n.sourceWorkId}`}
                          onClick={() => {
                            setOpen(false);
                            if (!n.read) void markRead(n.id);
                          }}
                        >
                          View work <span aria-hidden>→</span>
                        </Link>
                      ) : null}
                      {!n.read ? (
                        <button
                          type="button"
                          className="notif-item__mark-read"
                          onClick={() => void markRead(n.id)}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 ? (
            <div className="notif-bell__foot">
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--sm"
                disabled={busy || unreadCount === 0}
                onClick={() => void markAllRead()}
              >
                Mark all as read
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--sm"
                disabled={busy}
                onClick={() => void clearAll()}
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
