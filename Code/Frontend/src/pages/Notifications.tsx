import React, { useEffect, useState, useCallback } from 'react';
import type { AuthUser } from '../types/auth';
import { useLayoutContext } from '../components/LayoutContext';
import { fetchAlerts, markAlertAsRead, markAllAlertsAsRead, deleteAlerts } from '../api/alerts';
import type { Alert } from '../api/alerts';
import { useAlerts } from '../hooks/useAlerts';
import { getSession } from '../utils/session';
import { ALERTS_PAGE_SIZE } from '../constants';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
}

// Convert API Alert to NotificationItem
const alertToNotification = (alert: Alert): NotificationItem => ({
  id: alert.id,
  title: alert.title,
  message: alert.message,
  createdAt: alert.created_at,
  severity: alert.severity,
  read: alert.read,
});

const severityStyles: Record<NotificationItem['severity'], { bg: string; border: string; text: string }> = {
  info: { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
  warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  critical: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
};

const Notifications: React.FC = () => {
  const { setMenuOpen } = useLayoutContext();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Load user from session cookie
  useEffect(() => {
    const stored = getSession();
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  // Subscribe to real-time alerts
  useAlerts({
    userId: user?.user_id,
    onNewAlert: (alert) => {
      // Add new alert to the top of the list
      setNotifications((prev) => [alertToNotification(alert), ...prev]);
    },
  });

  // Load alerts from API
  const loadAlerts = useCallback(async () => {
    if (!user?.user_id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAlerts(user.user_id, { limit: ALERTS_PAGE_SIZE });
      setNotifications(response.alerts.map(alertToNotification));
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  // Load alerts when user is available
  useEffect(() => {
    if (user?.user_id) {
      loadAlerts();
    }
  }, [user?.user_id, loadAlerts]);

  const babyName = user?.baby?.first_name || 'Baby';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: number) => {
    if (!user?.user_id) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    try {
      await markAlertAsRead(id, user.user_id);
    } catch (err) {
      // Revert on error
      console.error('Failed to mark alert as read:', err);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  };

  const markAllAsRead = async () => {
    if (!user?.user_id) return;

    // Optimistic update
    const previousNotifications = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await markAllAlertsAsRead(user.user_id);
    } catch (err) {
      // Revert on error
      console.error('Failed to mark all alerts as read:', err);
      setNotifications(previousNotifications);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(notifications.map((n) => n.id)));
  };

  const deleteSingle = async (id: number) => {
    if (!user?.user_id) return;

    // Optimistic remove
    const previous = [...notifications];
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await deleteAlerts([id], user.user_id);
    } catch (err) {
      console.error('Failed to delete alert:', err);
      setNotifications(previous);
    }
  };

  const deleteSelected = async () => {
    if (!user?.user_id || selectedIds.size === 0) return;

    setDeleting(true);
    const idsToDelete = Array.from(selectedIds);

    // Optimistic remove
    const previous = [...notifications];
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
    setSelectMode(false);

    try {
      await deleteAlerts(idsToDelete, user.user_id);
    } catch (err) {
      console.error('Failed to delete alerts:', err);
      setNotifications(previous);
      setSelectedIds(new Set(idsToDelete));
      setSelectMode(true);
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <>
      {/* Header Section */}
      <section className="pt-6 px-5 pb-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="cursor-pointer rounded-full hover:bg-gray-50 transition-colors" onClick={() => setMenuOpen(true)}>
              <img className="[border:none] p-0 bg-[transparent] w-12 h-[37px] relative" alt="Menu" src="/hugeicons-menu-02.svg" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold font-[Kodchasan] text-[#000] m-0">Notifications</h1>
            <p className="text-sm font-[Kodchasan] text-gray-600 m-0">{unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}</p>
          </div>

          <img src="/logo.svg" alt="Nappi" className="w-12 h-12" />
        </div>

        {/* Action Buttons Row */}
        <div className="flex justify-between items-center">
          <div>
            {selectMode && notifications.length > 0 && (
              <button
                onClick={selectAll}
                className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md hover:shadow-lg transition-all active:scale-95 text-sm font-medium text-gray-700"
              >
                Select all
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md hover:shadow-lg transition-all active:scale-95 text-sm font-medium text-gray-700"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={toggleSelectMode}
                className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md hover:shadow-lg transition-all active:scale-95 text-sm font-medium text-gray-700"
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-5 pb-8 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <img
                src="/logo.svg"
                alt="Loading..."
                className="w-16 h-16 mx-auto mb-4"
                style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
              />
              <p className="text-gray-600 font-[Kodchasan]">Loading notifications...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg text-center">
            <span className="text-4xl mb-4 block text-red-500 font-bold">!</span>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadAlerts}
              className="bg-[#5DCCCC] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#4DBDBD] transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notifications.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-lg text-center">
                <span className="text-2xl font-semibold text-[#4ECDC4]">All clear</span>
                <h3 className="mt-4 mb-2 text-xl font-semibold text-[#000] font-[Kodchasan]">No notifications</h3>
                <p className="m-0 text-gray-600">{babyName} is sleeping soundly!</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const styles = severityStyles[notification.severity];
                const isSelected = selectedIds.has(notification.id);
                return (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (selectMode) {
                        toggleSelection(notification.id);
                      } else {
                        markAsRead(notification.id);
                      }
                    }}
                    className={`bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg cursor-pointer transition-all hover:shadow-xl active:scale-[0.99] ${
                      notification.read ? 'opacity-70' : ''
                    } ${selectMode && isSelected ? 'ring-2 ring-[#5DCCCC]' : ''}`}
                    style={{
                      borderLeft: `4px solid ${styles.border}`,
                    }}
                  >
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`m-0 text-base font-semibold font-[Kodchasan] ${notification.read ? 'text-gray-600' : 'text-[#000]'}`}>
                            {notification.title}
                          </h4>
                          {!selectMode && !notification.read && (
                            <span
                              className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white"
                              style={{ backgroundColor: styles.border }}
                            >
                              New
                            </span>
                          )}
                        </div>

                        <p className={`m-0 mb-2 text-sm leading-relaxed ${notification.read ? 'text-gray-400' : 'text-gray-700'}`}>{notification.message}</p>

                        <span className="text-xs text-gray-400 font-medium">{formatTime(notification.createdAt)}</span>
                      </div>

                      {/* Right side action: trash icon or checkbox */}
                      {selectMode ? (
                        <div className="flex items-center flex-shrink-0">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-[#5DCCCC] border-[#5DCCCC]' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSingle(notification.id);
                          }}
                          className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl bg-transparent hover:bg-red-50 transition-colors self-center"
                          aria-label="Delete notification"
                        >
                          <svg className="w-5 h-5 text-gray-400 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Info Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">Notifications are based on sensor data and sleep analysis</p>
      </section>

      {/* Floating Delete Bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-5">
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold px-6 py-3 rounded-2xl shadow-xl transition-all active:scale-95 w-full max-w-md"
          >
            {deleting ? 'Deleting...' : `Delete ${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </>
  );
};

export default Notifications;
