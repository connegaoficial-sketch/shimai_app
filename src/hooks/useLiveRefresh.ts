"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type UseLiveRefreshOptions = {
  /** Postgres table to watch */
  table: "orders" | "driver_notifications" | "client_notifications";
  /** Optional Realtime filter, e.g. driver_id=eq.uuid */
  filter?: string;
  /** Poll interval when tab visible (ms). Default 3000. */
  pollMs?: number;
  enabled?: boolean;
};

/**
 * Keeps server-rendered lists fresh: Supabase Realtime + 3s poll fallback.
 */
export function useLiveRefresh({
  table,
  filter,
  pollMs = 3000,
  enabled = true,
}: UseLiveRefreshOptions) {
  const router = useRouter();
  const lastRefresh = useRef(0);

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
        () => refresh(),
      )
      .subscribe();

    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, pollMs);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [enabled, filter, pollMs, router, table]);
}
