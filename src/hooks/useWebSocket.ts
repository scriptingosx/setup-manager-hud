import { useState, useEffect, useCallback, useRef } from "react";
import type { StoredEvent, Stats, WebhookPayload } from "@/types";

interface WebSocketState {
  connected: boolean;
  events: StoredEvent[];
  stats: Stats;
}

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    events: [],
    stats: { total: 0, started: 0, finished: 0, avgDuration: 0, successRate: 100, failedActions: 0 },
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
      reconnectAttempts.current = 0;
      ws.send(JSON.stringify({ type: "request-history", limit: 200 }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "history": {
          const seen = new Set<string>();
          const uniqueEvents = (message.data as StoredEvent[]).filter((e) => {
            if (seen.has(e.eventId)) return false;
            seen.add(e.eventId);
            return true;
          });
          setState((prev) => ({ ...prev, events: uniqueEvents }));
          break;
        }

        case "setup-manager-event":
          setState((prev) => {
            if (prev.events.some((e) => e.eventId === message.data.eventId)) {
              return prev;
            }
            return {
              ...prev,
              events: [message.data, ...prev.events].slice(0, 200),
            };
          });
          break;

        case "connected":
        case "pong":
          break;
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
      wsRef.current = null;

      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, []);

  useEffect(() => {
    connect();

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [connect]);

  // Compute stats from events
  useEffect(() => {
    const started = state.events.filter(
      (e) => e.payload.event === "com.jamf.setupmanager.started"
    );
    const finished = state.events.filter(
      (e) => e.payload.event === "com.jamf.setupmanager.finished"
    );

    const durations = finished
      .map((e) => (e.payload as WebhookPayload).duration)
      .filter((d): d is number => typeof d === "number" && d > 0);

    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    const failedActions = finished.reduce((count, e) => {
      const actions = (e.payload as WebhookPayload).enrollmentActions || [];
      return count + actions.filter((a) => a.status === "failed").length;
    }, 0);

    const totalActions = finished.reduce((count, e) => {
      return count + ((e.payload as WebhookPayload).enrollmentActions?.length || 0);
    }, 0);

    const successRate =
      totalActions > 0
        ? Math.round(((totalActions - failedActions) / totalActions) * 100)
        : 100;

    setState((prev) => ({
      ...prev,
      stats: {
        total: prev.events.length,
        started: started.length,
        finished: finished.length,
        avgDuration,
        successRate,
        failedActions,
      },
    }));
  }, [state.events]);

  return state;
}
