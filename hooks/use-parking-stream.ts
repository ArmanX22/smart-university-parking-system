"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SseSlotUpdateEvent, SseBookingUpdateEvent, SseMetricsUpdateEvent } from "@/server/services/sse.service";

interface UseParkingStreamOptions {
  enabled?: boolean;
  onSlotUpdate?: (event: SseSlotUpdateEvent) => void;
  onBookingUpdate?: (event: SseBookingUpdateEvent) => void;
  onMetricsUpdate?: (event: SseMetricsUpdateEvent) => void;
  onPollFallback?: () => void;
  pollIntervalMs?: number;
}

export function useParkingStream({
  enabled = true,
  onSlotUpdate,
  onBookingUpdate,
  onMetricsUpdate,
  onPollFallback,
  pollIntervalMs = 10000,
}: UseParkingStreamOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callback refs fresh
  const onSlotUpdateRef = useRef(onSlotUpdate);
  const onBookingUpdateRef = useRef(onBookingUpdate);
  const onMetricsUpdateRef = useRef(onMetricsUpdate);
  const onPollFallbackRef = useRef(onPollFallback);

  useEffect(() => {
    onSlotUpdateRef.current = onSlotUpdate;
    onBookingUpdateRef.current = onBookingUpdate;
    onMetricsUpdateRef.current = onMetricsUpdate;
    onPollFallbackRef.current = onPollFallback;
  }, [onSlotUpdate, onBookingUpdate, onMetricsUpdate, onPollFallback]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    setIsFallbackMode(true);
    pollIntervalRef.current = setInterval(() => {
      onPollFallbackRef.current?.();
    }, pollIntervalMs);
  }, [pollIntervalMs]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsFallbackMode(false);
  }, []);

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    if (!("EventSource" in window)) {
      startPolling();
      return;
    }

    try {
      const es = new EventSource("/api/sse/parking-updates");
      eventSourceRef.current = es;

      es.addEventListener("open", () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        stopPolling();
      });

      es.addEventListener("connected", () => {
        setIsConnected(true);
      });

      es.addEventListener("slot-update", (e) => {
        try {
          const data = JSON.parse(e.data) as SseSlotUpdateEvent;
          onSlotUpdateRef.current?.(data);
        } catch {
          // parse error
        }
      });

      es.addEventListener("booking-update", (e) => {
        try {
          const data = JSON.parse(e.data) as SseBookingUpdateEvent;
          onBookingUpdateRef.current?.(data);
        } catch {
          // parse error
        }
      });

      es.addEventListener("metrics-update", (e) => {
        try {
          const data = JSON.parse(e.data) as SseMetricsUpdateEvent;
          onMetricsUpdateRef.current?.(data);
        } catch {
          // parse error
        }
      });

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Exponential reconnect backoff: 3s -> 6s -> 12s -> max 30s
        const backoffMs = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;

        // If disconnected more than 2 times, activate fallback polling
        if (reconnectAttemptsRef.current >= 2) {
          startPolling();
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffMs);
      };
    } catch {
      startPolling();
    }
  }, [enabled, startPolling, stopPolling]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stopPolling();
    };
  }, [connect, stopPolling]);

  return {
    isConnected,
    isFallbackMode,
  };
}
