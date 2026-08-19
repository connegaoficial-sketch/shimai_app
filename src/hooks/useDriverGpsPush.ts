"use client";

import { useEffect, useRef } from "react";

import { upsertDriverLocation } from "@/app/(driver)/driver/(panel)/actions";

const MIN_INTERVAL_MS = 5000;

/**
 * Pushes GPS to shimai.driver_locations while `active`.
 * Clears watch when inactive / unmounted / delivered.
 */
export function useDriverGpsPush(input: {
  orderId: string;
  active: boolean;
}) {
  const lastSentRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!input.active) {
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSentRef.current < MIN_INTERVAL_MS) return;
        lastSentRef.current = now;
        void upsertDriverLocation({
          orderId: input.orderId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("[gps]", error.message);
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
}
