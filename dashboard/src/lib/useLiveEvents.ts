"use client";

import { useEffect, useRef } from "react";
import { apiPost } from "./api";

type LiveEvent = {
  type: string;
  site_id?: string;
  domain_id?: string;
  status?: string;
  incident_id?: string;
  days_left?: number;
};

export function useLiveEvents(onEvent: (event: LiveEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function connect() {
      let ticket: string;
      try {
        const res = await apiPost("/ws/ticket", {});
        ticket = res.ticket;
      } catch {
        return;
      }
      if (cancelled) return;

      const wsUrl = process.env.NEXT_PUBLIC_API_URL!.replace("http", "ws");
      const ws = new WebSocket(`${wsUrl}/ws?ticket=${ticket}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0; // Reset backoff on success
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          onEvent(data);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!cancelled && reconnectAttempts.current < 20) {
          // Exponential backoff: 1s, 2s, 4s, ..., up to 60s
          const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 60000);
          // Jitter: ±25%
          const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
          const delay = baseDelay + jitter;
          
          reconnectAttempts.current++;
          timeoutId = setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      clearTimeout(timeoutId);
    };
  }, [onEvent]);
}