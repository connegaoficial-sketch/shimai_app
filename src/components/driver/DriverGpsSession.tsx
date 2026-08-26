"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { upsertDriverLocation } from "@/app/(driver)/driver/(panel)/actions";
import { Button } from "@/components/ui/button";
import { DEFAULT_DELIVERY_CONFIG } from "@/lib/delivery/default-config";
import { isInMexicoBounds } from "@/lib/delivery/mexico-bounds";
import { createClient } from "@/lib/supabase/client";

const MIN_INTERVAL_MS = 5000;
const ORDERS_POLL_MS = 8000;

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

type GeoState = "checking" | "prompt" | "granted" | "denied" | "unsupported";

/**
 * Shell-level GPS: explicitly asks for location and keeps watchPosition alive
 * for every in_transit order assigned to this driver (not only while on detail page).
 */
export function DriverGpsSession({ driverId }: { driverId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [geoState, setGeoState] = useState<GeoState>("checking");
  const [activeOrderIds, setActiveOrderIds] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [lastFixAt, setLastFixAt] = useState<string | null>(null);
  const lastSentRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const orderIdsRef = useRef<string[]>([]);

  orderIdsRef.current = activeOrderIds;

  async function refreshActiveOrders() {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("driver_id", driverId)
      .eq("status", "in_transit");
    setActiveOrderIds((data ?? []).map((row) => row.id));
  }

  async function readPermission(): Promise<GeoState> {
    if (!("geolocation" in navigator)) return "unsupported";
    try {
      if ("permissions" in navigator) {
        const status = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (status.state === "granted") return "granted";
        if (status.state === "denied") return "denied";
        return "prompt";
      }
    } catch {
      // Safari / older browsers
    }
    return "prompt";
  }

  useEffect(() => {
    void readPermission().then(setGeoState);
    void refreshActiveOrders();

    const poll = window.setInterval(() => {
      void refreshActiveOrders();
    }, ORDERS_POLL_MS);

    const channel = supabase
      .channel(`driver-gps-orders-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shimai",
          table: "orders",
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          void refreshActiveOrders();
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [driverId, supabase]);

  useEffect(() => {
    if (geoState !== "granted") {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (activeOrderIds.length === 0) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setWarning(null);
      return;
    }

    if (watchIdRef.current != null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;

        if (!isInMexicoBounds(lat, lng)) {
          if (isLocalDevHost()) {
            lat = DEFAULT_DELIVERY_CONFIG.kitchen_coordinates.lat;
            lng = DEFAULT_DELIVERY_CONFIG.kitchen_coordinates.lng;
            setWarning(
              "Tu PC reportó una ubicación incorrecta. En pruebas locales usamos la cocina.",
            );
          } else {
            setWarning(
              "Ubicación fuera de México. Activa GPS preciso y desactiva VPN.",
            );
            return;
          }
        } else {
          setWarning(null);
        }

        const now = Date.now();
        if (now - lastSentRef.current < MIN_INTERVAL_MS) return;
        lastSentRef.current = now;
        setLastFixAt(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

        for (const orderId of orderIdsRef.current) {
          void upsertDriverLocation({ orderId, lat, lng }).then((result) => {
            if (!result.ok) return;
            window.dispatchEvent(
              new CustomEvent("shimai:gps-fix", {
                detail: {
                  orderId,
                  lat,
                  lng,
                  at: Date.now(),
                },
              }),
            );
          });
        }
      },
      (error) => {
        console.warn("[gps]", error.message);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoState("denied");
        }
        setWarning(
          "No pudimos leer tu ubicación. Revisa permisos de ubicación.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 20000,
      },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeOrderIds.length, geoState]);

  async function requestLocation() {
    if (!("geolocation" in navigator)) {
      setGeoState("unsupported");
      return;
    }

    // User gesture → browser shows the system location prompt
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoState("granted");
        setWarning(null);
        void refreshActiveOrders();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoState("denied");
        } else {
          setWarning("No se obtuvo GPS. Intenta de nuevo al aire libre.");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    function onRequestGps() {
      void requestLocation();
    }
    window.addEventListener("shimai:request-gps", onRequestGps);
    return () => {
      window.removeEventListener("shimai:request-gps", onRequestGps);
    };
  }, []);

  if (geoState === "checking") return null;

  if (geoState === "unsupported") {
    return (
      <p className="rounded-md border border-white/[0.08] bg-shimai-surface/60 px-3 py-2 font-sans text-xs text-shimai-ivory/55">
        Este navegador no soporta GPS. Usa el celular para repartir.
      </p>
    );
  }

  if (geoState === "denied") {
    return (
      <p className="rounded-md border border-shimai-sakura/35 bg-shimai-sakura/10 px-3 py-2 font-sans text-xs text-shimai-ivory/80">
        Ubicación bloqueada. En ajustes del navegador/PWA permite ubicación para
        SHIMAI y recarga.
      </p>
    );
  }

  if (geoState === "prompt") {
    return (
      <div className="rounded-md border border-shimai-gold/35 bg-shimai-gold/10 px-4 py-3">
        <p className="font-sans text-sm font-medium text-shimai-gold">
          Activa tu ubicación en tiempo real
        </p>
        <p className="mt-1 font-sans text-xs leading-relaxed text-shimai-ivory/70">
          El cliente ve tu pin en el mapa mientras entregas. Sin GPS el tracker
          no se mueve.
        </p>
        <Button size="sm" className="mt-3" onClick={() => void requestLocation()}>
          Permitir ubicación
        </Button>
      </div>
    );
  }

  // granted
  return (
    <div className="rounded-md border border-white/[0.08] bg-shimai-surface/40 px-3 py-2">
      <p className="font-sans text-xs text-shimai-ivory/70">
        {activeOrderIds.length > 0 ? (
          <>
            GPS activo · {activeOrderIds.length} entrega
            {activeOrderIds.length === 1 ? "" : "s"} en tránsito
            {lastFixAt ? ` · último fix ${lastFixAt}` : ""}
          </>
        ) : (
          <>
            Ubicación lista. Se enviará al mapa cuando inicies una entrega.
          </>
        )}
      </p>
      {warning ? (
        <p className="mt-1 font-sans text-xs text-shimai-sakura">{warning}</p>
      ) : null}
      {activeOrderIds.length === 0 ? (
        <button
          type="button"
          className="mt-1 font-sans text-[11px] text-shimai-gold"
          onClick={() => void requestLocation()}
        >
          Probar GPS ahora
        </button>
      ) : null}
    </div>
  );
}
