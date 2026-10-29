"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type UseLiveRefreshOptions = {
  /** Postgres table to watch */
  table: "orders" | "notifications";
  /** Optional Realtime filter, e.g. driver_id=eq.uuid */
  filter?: string;
  /** Poll interval in milliseconds. Default 5000. */
  pollMs?: number;
  enabled?: boolean;
  /** Called immediately when a new row is inserted */
  onInsert?: (payload: { new: Record<string, unknown> }) => void;
};

/**
 * Keeps server-rendered lists fresh automatically: Supabase Realtime + 5s auto-poll.
 */
export function useLiveRefresh({
  table,
  filter,
  pollMs = 5000,
  enabled = true,
  onInsert,
}: UseLiveRefreshOptions) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const onInsertRef = useRef(onInsert);

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    function refresh() {
      const now = Date.now();
      if (now - lastRefresh.current < 800) return;
      lastRefresh.current = now;
      router.refresh();
    }

    const channel = supabase
      .channel(`live-${table}-${filter ?? "all"}-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shimai",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            onInsertRef.current?.(payload as unknown as { new: Record<string, unknown> });
          }
          refresh();
        },
      )
      .subscribe();

    // Automatic polling every pollMs (5s default)
    const poll = window.setInterval(() => {
      refresh();
    }, pollMs);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [enabled, filter, pollMs, router, table]);
}
