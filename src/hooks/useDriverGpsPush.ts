"use client";

import { useEffect, useRef, useState } from "react";

import { upsertDriverLocation } from "@/app/(driver)/driver/(panel)/actions";
import { DEFAULT_DELIVERY_CONFIG } from "@/lib/delivery/default-config";
import { isInMexicoBounds } from "@/lib/delivery/mexico-bounds";

const MIN_INTERVAL_MS = 5000;

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Pushes GPS to shimai.driver_locations while `active`.
 * Clears watch when inactive / unmounted / delivered.
 * Returns a user-facing warning when location looks wrong (e.g. desktop IP geolocation).
 */
export function useDriverGpsPush(input: {
  orderId: string;
  active: boolean;
}): string | null {
  const lastSentRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!input.active) {
      setWarning(null);
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      setWarning("Tu navegador no soporta GPS. Usa el celular para repartir.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;

        if (!isInMexicoBounds(lat, lng)) {
          if (isLocalDevHost()) {
            lat = DEFAULT_DELIVERY_CONFIG.kitchen_coordinates.lat;
            lng = DEFAULT_DELIVERY_CONFIG.kitchen_coordinates.lng;
            setWarning(
              "Tu PC reportó una ubicación incorrecta (VPN o IP). En pruebas locales usamos la cocina.",
            );
          } else {
            setWarning(
              "Ubicación fuera de México. Activa GPS preciso en el celular y desactiva VPN.",
            );
            return;
          }
        } else {
          setWarning(null);
        }

        const now = Date.now();
        if (now - lastSentRef.current < MIN_INTERVAL_MS) return;
        lastSentRef.current = now;
        void upsertDriverLocation({
          orderId: input.orderId,
          lat,
          lng,
        });
      },
      (error) => {
        console.warn("[gps]", error.message);
        setWarning(
          "No pudimos leer tu ubicación. Revisa permisos de ubicación en el navegador.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [input.active, input.orderId]);

  return warning;
}
