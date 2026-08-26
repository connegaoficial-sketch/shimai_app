"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type InboxRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

const CLIENT_PREF_KINDS = [
  { kind: "order_preparing", label: "Preparando" },
  { kind: "order_ready", label: "Listo" },
  { kind: "order_in_transit", label: "En camino" },
  { kind: "driver_nearby", label: "Repartidor cerca" },
  { kind: "order_delivered", label: "Entregado" },
] as const;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

/**
 * Light client notification center for tracker: toast + history + mute prefs.
 */
export function ClientNotificationCenter({ orderId }: { orderId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const channelId = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<InboxRow | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  async function loadInbox() {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, kind, is_read, created_at")
        .eq("audience", "client")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("audience", "client")
        .eq("order_id", orderId)
        .eq("is_read", false),
    ]);
    setRows((data as InboxRow[]) ?? []);
    setUnread(count ?? 0);
  }

  async function loadPrefs() {
    const { data } = await supabase
      .from("notification_prefs")
      .select("kind, enabled")
      .eq("audience", "client")
      .eq("order_id", orderId);
    const map: Record<string, boolean> = {};
    for (const row of data ?? []) {
      map[row.kind] = row.enabled;
    }
    setPrefs(map);
  }

  useEffect(() => {
    void loadInbox();
    void loadPrefs();
  }, [orderId]);

  useEffect(() => {
    const channel = supabase
      .channel(`client-inbox-${orderId}-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "shimai",
          table: "notifications",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as InboxRow & { audience?: string };
          if (!row?.id || row.audience !== "client") return;
          setToast(row);
          void loadInbox();
          window.setTimeout(() => {
            setToast((current) => (current?.id === row.id ? null : current));
          }, 8000);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelId, orderId, supabase]);

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("order_id", orderId);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)),
    );
    setUnread((n) => Math.max(0, n - 1));
  }

  async function togglePref(kind: string) {
    const current = prefs[kind] ?? true;
    const next = !current;
    setPrefs((p) => ({ ...p, [kind]: next }));

    const { data: existing } = await supabase
      .from("notification_prefs")
      .select("id")
      .eq("audience", "client")
      .eq("order_id", orderId)
      .eq("kind", kind)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("notification_prefs")
        .update({ enabled: next, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("notification_prefs").insert({
        audience: "client",
        order_id: orderId,
        recipient_id: null,
        kind,
        enabled: next,
      });
    }
  }

  const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-label="Avisos del pedido"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) void loadInbox();
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.1] text-shimai-ivory"
        >
          <BellIcon />
          {badge ? (
            <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-shimai-sakura px-1 font-sans text-[9px] font-bold text-shimai-black">
              {badge}
            </span>
          ) : null}
        </button>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-md border border-white/[0.1] bg-shimai-black shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
                <p className="font-sans text-sm text-shimai-ivory">Tu pedido</p>
                <button
                  type="button"
                  className="font-sans text-[11px] text-shimai-gold"
                  onClick={() => setPrefsOpen((v) => !v)}
                >
                  Preferencias
                </button>
              </div>

              {prefsOpen ? (
                <div className="space-y-2 border-b border-white/[0.08] px-3 py-3">
                  {CLIENT_PREF_KINDS.map((pref) => (
                    <label
                      key={pref.kind}
                      className="flex items-center justify-between gap-3 font-sans text-xs text-shimai-ivory/80"
                    >
                      <span>{pref.label}</span>
                      <input
                        type="checkbox"
                        checked={prefs[pref.kind] ?? true}
                        onChange={() => void togglePref(pref.kind)}
                        className="h-4 w-4 accent-shimai-sakura"
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <ul className="max-h-64 overflow-y-auto">
                {rows.length === 0 ? (
                  <li className="px-3 py-5 text-center font-sans text-xs text-shimai-ivory/45">
                    Aún no hay avisos
                  </li>
                ) : (
                  rows.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!row.is_read) void markRead(row.id);
                        }}
                        className={cn(
                          "w-full border-b border-white/[0.06] px-3 py-3 text-left",
                          !row.is_read && "bg-shimai-sakura/[0.07]",
                        )}
                      >
                        <div className="flex justify-between gap-2">
                          <p className="font-sans text-sm text-shimai-ivory">
                            {row.title}
                          </p>
                          <span className="font-sans text-[10px] text-shimai-ivory/40">
                            {relativeTime(row.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 font-sans text-xs text-shimai-ivory/65">
                          {row.body}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      {toast ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-50 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <Link
            href={`/tracker/${orderId}`}
            onClick={() => setToast(null)}
            className="pointer-events-auto w-full max-w-lg rounded-md border border-shimai-sakura/45 bg-shimai-black/95 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
          >
            <p className="font-sans text-sm font-medium text-shimai-sakura">
              {toast.title}
            </p>
            <p className="mt-1 font-sans text-sm text-shimai-ivory/85">
              {toast.body}
            </p>
          </Link>
        </div>
      ) : null}
    </>
  );
}

function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
