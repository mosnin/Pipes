"use client";

import { useEffect, useRef, useState } from "react";

export type PresenceRecord = {
  userId: string;
  sessionId: string;
  selectedNodeId?: string;
  editingTarget?: string;
  cursor?: { x: number; y: number };
  lastSeenAt: string;
};

type UsePresenceOptions = {
  systemId: string;
  currentUserId?: string;
  enabled?: boolean;
};

export function usePresence({ systemId, currentUserId, enabled = true }: UsePresenceOptions): PresenceRecord[] {
  const [records, setRecords] = useState<PresenceRecord[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !systemId) return;

    // Poll presence via REST — Convex real-time subscriptions require
    // the systemId as a Convex document ID which isn't available in the
    // REST context. Polling every 5s is sufficient for presence indicators.
    const poll = async () => {
      try {
        const res = await fetch(`/api/presence?systemId=${encodeURIComponent(systemId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const all: PresenceRecord[] = data.data ?? [];
        // Filter out the current user's own record
        setRecords(currentUserId ? all.filter((r) => r.userId !== currentUserId) : all);
      } catch {
        // ignore — presence is best-effort
      }
    };

    void poll();
    intervalRef.current = setInterval(poll, 5_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [systemId, currentUserId, enabled]);

  return records;
}

export function usePublishPresence(systemId: string) {
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publish = (update: { selectedNodeId?: string; editingTarget?: string; cursor?: { x: number; y: number } }) => {
    if (throttleRef.current) return; // throttle to 1 publish/2s
    throttleRef.current = setTimeout(() => { throttleRef.current = null; }, 2_000);

    void fetch("/api/presence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemId, ...update }),
    }).catch(() => {});
  };

  return publish;
}
