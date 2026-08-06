/**
 * useSSE.js — Real-Time Server-Sent Events Hook
 * 
 * Connects to /api/events and dispatches typed events.
 * Auto-reconnects on disconnect with exponential backoff.
 * 
 * Usage:
 *   const { isConnected, lastEvent } = useSSE(token, onEvent);
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../api.js';

export function useSSE(token, onEvent) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const esRef = useRef(null);
  const retryCount = useRef(0);
  const retryTimer = useRef(null);

  const connect = useCallback(() => {
    if (!token) return;
    if (esRef.current) {
      esRef.current.close();
    }

    try {
      // SSE with auth via URL param (EventSource doesn't support custom headers)
      const es = new EventSource(`${API_BASE}/api/events?token=${encodeURIComponent(token)}`);
      esRef.current = es;

      es.addEventListener('connected', (e) => {
        setIsConnected(true);
        retryCount.current = 0;
        const data = JSON.parse(e.data);
        console.log('[SSE] Connected:', data.message);
      });

      // Listen to all custom event types
      const eventTypes = [
        'CLAIM_SUBMITTED',
        'CLAIM_STATUS_CHANGED',
        'CLAIM_ESCALATED',
        'PAYOUT_DISBURSED',
        'AI_ANALYSIS_COMPLETE',
        'USER_LOGGED_IN',
        'CONFIG_UPDATED'
      ];

      eventTypes.forEach(type => {
        es.addEventListener(type, (e) => {
          const event = { type, data: JSON.parse(e.data) };
          setLastEvent(event);
          onEvent?.(event);
        });
      });

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        esRef.current = null;

        // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
        const delay = Math.min(2000 * Math.pow(2, retryCount.current), 30000);
        retryCount.current++;
        console.log(`[SSE] Disconnected. Retrying in ${delay / 1000}s...`);
        retryTimer.current = setTimeout(connect, delay);
      };
    } catch (err) {
      console.error('[SSE] Failed to connect:', err);
    }
  }, [token, onEvent]);

  useEffect(() => {
    if (token) {
      connect();
    }
    return () => {
      clearTimeout(retryTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setIsConnected(false);
    };
  }, [token, connect]);

  return { isConnected, lastEvent };
}
