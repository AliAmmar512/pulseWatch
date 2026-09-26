"use client";

import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

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

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) return;

      const wsUrl = process.env.NEXT_PUBLIC_API_URL!.replace("http", "ws");
      const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          onEvent(data);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          setTimeout(connect, 2000); // reconnect with simple backoff
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, [onEvent]);
}