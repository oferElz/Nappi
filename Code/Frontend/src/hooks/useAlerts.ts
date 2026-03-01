import { useEffect, useState, useCallback, useRef } from 'react';
import { getAlertsStreamUrl } from '../api/alerts';
import type { Alert } from '../api/alerts';
import { SSE_RECONNECT_DELAY_MS, ALERTS_MAX_IN_MEMORY } from '../constants';

interface UseAlertsOptions {
  userId: number | undefined;
  onNewAlert?: (alert: Alert) => void;
}

interface UseAlertsReturn {
  connected: boolean;
  latestAlert: Alert | null;
  alerts: Alert[];
  clearAlerts: () => void;
}

/**
 * Hook for subscribing to real-time alerts via Server-Sent Events.
 * 
 * Automatically connects when userId is provided, reconnects on disconnect,
 * and provides the latest alert and connection status.
 * 
 * @example
 * ```tsx
 * const { connected, latestAlert, alerts } = useAlerts({
 *   userId: user?.user_id,
 *   onNewAlert: (alert) => {
 *     toast.show(alert.title);
 *   },
 * });
 * ```
 */
export function useAlerts({ userId, onNewAlert }: UseAlertsOptions): UseAlertsReturn {
  const [connected, setConnected] = useState(false);
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNewAlertRef = useRef(onNewAlert);
  
  // Keep callback ref up to date
  useEffect(() => {
    onNewAlertRef.current = onNewAlert;
  }, [onNewAlert]);
  
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setLatestAlert(null);
  }, []);
  
  const connect = useCallback(() => {
    if (!userId) return;
    
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const url = getAlertsStreamUrl(userId);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('[SSE] Connected to alerts stream');
      setConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const alert = JSON.parse(event.data) as Alert;
        console.log('[SSE] Received alert:', alert);
        
        setLatestAlert(alert);
        setAlerts((prev) => [alert, ...prev].slice(0, ALERTS_MAX_IN_MEMORY));
        
        // Call the callback if provided
        onNewAlertRef.current?.(alert);
      } catch (error) {
        console.error('[SSE] Failed to parse alert:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setConnected(false);
      eventSource.close();
      
      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[SSE] Attempting to reconnect...');
        connect();
      }, SSE_RECONNECT_DELAY_MS);
    };
    
    // Handle custom 'connected' event
    eventSource.addEventListener('connected', () => {
      console.log('[SSE] Received connected event');
      setConnected(true);
    });
  }, [userId]);
  
  // Connect when userId changes
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    return () => {
      // Cleanup on unmount or userId change
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setConnected(false);
    };
  }, [userId, connect]);
  
  return {
    connected,
    latestAlert,
    alerts,
    clearAlerts,
  };
}

export default useAlerts;
