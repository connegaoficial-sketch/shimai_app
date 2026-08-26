"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type InboxRow = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  order_id: string | null;
  kind: string;
  is_read: boolean;
  created_at: string;
};

const DRIVER_PREF_KINDS = [
  { kind: "order_assigned", label: "Nuevos repartos" },
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

export function DriverNotificationCenter({ driverId }: { driverId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const channelId = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<InboxRow | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [assignEnabled, setAssignEnabled] = useState(true);

  async function loadInbox() {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, link, order_id, kind, is_read, created_at")
        .eq("audience", "driver")
        .eq("recipient_id", driverId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("audience", "driver")
        .eq("recipient_id", driverId)
        .eq("is_read", false),
    ]);
    setRows((data as InboxRow[]) ?? []);
    setUnread(count ?? 0);
  }

  async function loadPrefs() {
    const { data } = await supabase
      .from("notification_prefs")
      .select("kind, enabled")
      .eq("audience", "driver")
      .eq("recipient_id", driverId)
      .eq("kind", "order_assigned")
      .maybeSingle();
    setAssignEnabled(data?.enabled ?? true);
  }

  useEffect(() => {
    void loadInbox();
    void loadPrefs();
  }, [driverId]);

  useEffect(() => {
    const channel = supabase
      .channel(`driver-inbox-${driverId}-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "shimai",
          table: "notifications",
          filter: `recipient_id=eq.${driverId}`,
        },
        (payload) => {
          const row = payload.new as InboxRow;
          if (!row?.id) return;
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
  }, [channelId, driverId, supabase]);

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("recipient_id", driverId);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)),
    );
    setUnread((n) => Math.max(0, n - 1));
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("audience", "driver")
      .eq("recipient_id", driverId)
      .eq("is_read", false);
    setRows((prev) => prev.map((r) => ({ ...r, is_read: true })));
    setUnread(0);
  }

  async function toggleAssignPref() {
    const next = !assignEnabled;
    setAssignEnabled(next);

    const { data: existing } = await supabase
      .from("notification_prefs")
      .select("id")
      .eq("audience", "driver")
      .eq("recipient_id", driverId)
      .eq("kind", "order_assigned")
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("notification_prefs")
        .update({ enabled: next, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("notification_prefs").insert({
        audience: "driver",
        recipient_id: driverId,
        order_id: null,
        kind: "order_assigned",
        enabled: next,
      });
    }
  }

  const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;
  const toastHref =
    toast?.link ||
    (toast?.order_id ? `/driver/orders/${toast.order_id}` : "/driver");

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-label="Notificaciones"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) void loadInbox();
          }}
          className="relative flex h-11 w-11 items-center justify-center rounded-md border border-white/[0.1] text-shimai-ivory transition-colors hover:border-shimai-gold/40"
        >
          <BellIcon />
          {badge ? (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-shimai-sakura px-1 font-sans text-[10px] font-bold text-shimai-black">
              {badge}
            </span>
          ) : null}
        </button>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-md border border-white/[0.1] bg-shimai-black shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
                <p className="font-sans text-sm font-medium text-shimai-ivory">
                  Avisos
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="font-sans text-[11px] text-shimai-gold"
                    onClick={() => setPrefsOpen((v) => !v)}
                  >
                    Preferencias
                  </button>
                  {unread > 0 ? (
                    <button
                      type="button"
                      className="font-sans text-[11px] text-shimai-ivory/55"
                      onClick={() => void markAllRead()}
                    >
                      Marcar leídas
                    </button>
                  ) : null}
                </div>
              </div>

              {prefsOpen ? (
                <div className="border-b border-white/[0.08] px-3 py-3">
                  {DRIVER_PREF_KINDS.map((pref) => (
                    <label
                      key={pref.kind}
                      className="flex items-center justify-between gap-3 font-sans text-xs text-shimai-ivory/80"
                    >
                      <span>{pref.label}</span>
                      <input
                        type="checkbox"
                        checked={assignEnabled}
                        onChange={() => void toggleAssignPref()}
                        className="h-4 w-4 accent-shimai-gold"
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <ul className="max-h-80 overflow-y-auto">
                {rows.length === 0 ? (
                  <li className="px-3 py-6 text-center font-sans text-xs text-shimai-ivory/45">
                    Sin avisos todavía
                  </li>
                ) : (
                  rows.map((row) => {
                    const href =
                      row.link ||
                      (row.order_id
                        ? `/driver/orders/${row.order_id}`
                        : "/driver");
                    return (
                      <li key={row.id}>
                        <Link
                          href={href}
                          onClick={() => {
                            if (!row.is_read) void markRead(row.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "block border-b border-white/[0.06] px-3 py-3 transition-colors hover:bg-white/[0.03]",
                            !row.is_read && "bg-shimai-gold/[0.06]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-sans text-sm text-shimai-ivory">
                              {row.title}
                            </p>
                            <span className="shrink-0 font-sans text-[10px] text-shimai-ivory/40">
                              {relativeTime(row.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 font-sans text-xs text-shimai-ivory/65">
                            {row.body}
                          </p>
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      {toast ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-[max(4.5rem,env(safe-area-inset-top,0px))] z-50 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <Link
            href={toastHref}
            onClick={() => setToast(null)}
            className="pointer-events-auto w-full max-w-lg rounded-md border border-shimai-gold/45 bg-shimai-black/95 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
          >
            <p className="font-sans text-sm font-medium text-shimai-gold">
              {toast.title}
            </p>
            <p className="mt-1 font-sans text-sm text-shimai-ivory/85">
              {toast.body}
            </p>
            <p className="mt-2 font-sans text-xs text-shimai-ivory/45">
              Toca para abrir el pedido →
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
      width="18"
      height="18"
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
