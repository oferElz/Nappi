import { api } from './client';
import { ALERTS_PAGE_SIZE } from '../constants';

// ============================================
// Types
// ============================================

export interface Alert {
  id: number;
  baby_id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface AlertListResponse {
  alerts: Alert[];
  total_count: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface InterventionRequest {
  baby_id: number;
  action: 'mark_asleep' | 'mark_awake';
}

export interface InterventionResponse {
  baby_id: number;
  status: 'sleeping' | 'awake';
  cooldown_minutes: number;
  cooldown_until: string;
  message: string;
}

export interface SleepStatusResponse {
  baby_id: number;
  is_sleeping: boolean;
  sleep_started_at?: string;
  sleep_duration_minutes?: number;
}

export interface CooldownStatusResponse {
  baby_id: number;
  in_cooldown: boolean;
  cooldown_remaining_minutes?: number;
  message: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface VapidKeyResponse {
  public_key: string | null;
  configured: boolean;
}

export interface PushStatusResponse {
  subscribed: boolean;
  push_configured: boolean;
}

// ============================================
// Alert API Functions
// ============================================

/**
 * Get alert history for a user
 */
export async function fetchAlerts(
  userId: number,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<AlertListResponse> {
  const { limit = ALERTS_PAGE_SIZE, offset = 0, unreadOnly = false } = options;
  const res = await api.get<AlertListResponse>('/alerts/history', {
    params: {
      user_id: userId,
      limit,
      offset,
      unread_only: unreadOnly,
    },
  });
  return res.data;
}

/**
 * Get count of unread alerts
 */
export async function fetchUnreadCount(userId: number): Promise<number> {
  const res = await api.get<UnreadCountResponse>('/alerts/unread-count', {
    params: { user_id: userId },
  });
  return res.data.count;
}

/**
 * Mark a single alert as read
 */
export async function markAlertAsRead(alertId: number, userId: number): Promise<boolean> {
  const res = await api.post(`/alerts/${alertId}/read`, null, {
    params: { user_id: userId },
  });
  return res.data.success;
}

/**
 * Mark all alerts as read
 */
export async function markAllAlertsAsRead(userId: number): Promise<number> {
  const res = await api.post('/alerts/read-all', null, {
    params: { user_id: userId },
  });
  return res.data.updated_count;
}

/**
 * Delete alerts by IDs
 */
export async function deleteAlerts(alertIds: number[], userId: number): Promise<number> {
  const res = await api.delete<{ deleted_count: number }>('/alerts', {
    data: { alert_ids: alertIds },
    params: { user_id: userId },
  });
  return res.data.deleted_count;
}

// ============================================
// Intervention API Functions
// ============================================

/**
 * Get current sleep status for a baby
 */
export async function fetchSleepStatus(babyId: number): Promise<SleepStatusResponse> {
  const res = await api.get<SleepStatusResponse>(`/sensor/sleep-status/${babyId}`);
  return res.data;
}

/**
 * Get cooldown status for a baby
 */
export async function fetchCooldownStatus(babyId: number): Promise<CooldownStatusResponse> {
  const res = await api.get<CooldownStatusResponse>(`/sensor/cooldown-status/${babyId}`);
  return res.data;
}

/**
 * Submit parent intervention to override sleep state
 */
export async function submitIntervention(
  babyId: number,
  action: 'mark_asleep' | 'mark_awake'
): Promise<InterventionResponse> {
  const res = await api.post<InterventionResponse>('/sensor/intervention', {
    baby_id: babyId,
    action,
  });
  return res.data;
}

// ============================================
// Push Notification API Functions
// ============================================

/**
 * Get the VAPID public key for push subscription
 */
export async function fetchVapidKey(): Promise<VapidKeyResponse> {
  const res = await api.get<VapidKeyResponse>('/push/vapid-key');
  return res.data;
}

/**
 * Check if user has an active push subscription
 */
export async function fetchPushStatus(userId: number): Promise<PushStatusResponse> {
  const res = await api.get<PushStatusResponse>('/push/status', {
    params: { user_id: userId },
  });
  return res.data;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  userId: number,
  subscription: PushSubscription
): Promise<boolean> {
  const res = await api.post('/push/subscribe', subscription, {
    params: { user_id: userId },
  });
  return res.data.success;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId: number): Promise<boolean> {
  const res = await api.post('/push/unsubscribe', null, {
    params: { user_id: userId },
  });
  return res.data.success;
}

// ============================================
// SSE Helper
// ============================================

/**
 * Get the SSE stream URL for a user
 */
export function getAlertsStreamUrl(userId: number): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return `${baseUrl}/alerts/stream?user_id=${userId}`;
}
