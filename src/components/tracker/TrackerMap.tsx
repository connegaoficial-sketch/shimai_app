"use client";

import { useEffect, useRef, useState } from "react";

import {
  loadGoogleMaps,
  SHIMAI_MAP_STYLES,
} from "@/lib/maps/load-google-maps";

type LatLng = { lat: number; lng: number };

type TrackerMapProps = {
  customer: LatLng | null;
  driver: LatLng | null;
};

const FALLBACK_CENTER = { lat: 21.916146, lng: -99.9900263 };

/** Re-fit when distance shrinks by this fraction (progressive zoom-in). */
const APPROACH_REFIT_RATIO = 0.88;

/** Destination — sakura house pin */
const CUSTOMER_PIN = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <path fill="#E8A5B5" stroke="#1a1a1a" stroke-width="1.6"
      d="M18 2c-7.7 0-14 6.1-14 13.6C4 26.2 18 42 18 42s14-15.8 14-26.4C32 8.1 25.7 2 18 2z"/>
    <path fill="#1a1a1a" d="M12 22.5V17l6-4.5 6 4.5v5.5h-3.2v-3.2h-5.6v3.2H12z"/>
  </svg>`,
);

/** Driver — gold map pin with scooter (no CSS halo) */
const DRIVER_PIN = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
    <path fill="#C9A45C" stroke="#1a1a1a" stroke-width="1.8"
      d="M20 2c-8.3 0-15 6.5-15 14.5C5 29.2 20 46 20 46s15-16.8 15-29.5C35 8.5 28.3 2 20 2z"/>
    <circle cx="13.5" cy="20" r="3.2" fill="none" stroke="#1a1a1a" stroke-width="1.6"/>
    <circle cx="26.5" cy="20" r="3.2" fill="none" stroke="#1a1a1a" stroke-width="1.6"/>
    <path fill="none" stroke="#1a1a1a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
      d="M16.5 20h7M23.5 20l2-5h3.5M18 15h4.5"/>
  </svg>`,
);

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function TrackerMap({ customer, driver }: TrackerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapsApiRef = useRef<typeof google.maps | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);
  const lastApproachMetersRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;
        mapsApiRef.current = maps;

        const center = driver ?? customer ?? FALLBACK_CENTER;
        const map = new maps.Map(containerRef.current, {
          center,
          zoom: 15,
          minZoom: 12,
          maxZoom: 18,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.ControlPosition.RIGHT_BOTTOM,
          },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          styles: SHIMAI_MAP_STYLES,
        });

        mapRef.current = map;
        setReady(true);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        console.error("[TrackerMap]", error);
        setLoadError("No se pudo cargar el mapa.");
      }
    }

    void init();

    return () => {
      cancelled = true;
      driverMarkerRef.current?.setMap(null);
      customerMarkerRef.current?.setMap(null);
      driverMarkerRef.current = null;
      customerMarkerRef.current = null;
      lastApproachMetersRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!map || !maps) return;

    if (customer) {
      if (!customerMarkerRef.current) {
        customerMarkerRef.current = new maps.Marker({
          map,
          position: customer,
          title: "Tu ubicación",
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${CUSTOMER_PIN}`,
            scaledSize: new maps.Size(36, 44),
            anchor: new maps.Point(18, 44),
          },
          zIndex: 1,
        });
      } else {
        customerMarkerRef.current.setPosition(customer);
      }
    }

    if (driver) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new maps.Marker({
          map,
          position: driver,
          title: "Repartidor",
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${DRIVER_PIN}`,
            scaledSize: new maps.Size(40, 48),
            anchor: new maps.Point(20, 48),
          },
          zIndex: 2,
        });
      } else {
        driverMarkerRef.current.setPosition(driver);
      }
    }

    if (customer && driver) {
      const meters = haversineMeters(customer, driver);
      const last = lastApproachMetersRef.current;
      const view = map.getBounds();
      const outOfView =
        !!view && (!view.contains(customer) || !view.contains(driver));
      const firstFrame = last == null;
      const gotCloser =
        last != null && meters < last * APPROACH_REFIT_RATIO;

      if (firstFrame || gotCloser || outOfView) {
        const bounds = new maps.LatLngBounds();
        bounds.extend(customer);
        bounds.extend(driver);
        map.fitBounds(bounds, 64);
        lastApproachMetersRef.current = meters;
      }
      return;
    }

    const alone = customer ?? driver;
    if (alone && lastApproachMetersRef.current == null) {
      map.panTo(alone);
      const zoom = map.getZoom() ?? 15;
      if (zoom < 15) map.setZoom(15);
      lastApproachMetersRef.current = 0;
    }
  }, [customer, driver, ready]);

  return (
    <div className="relative h-full w-full bg-[#1c1c1c]">
      {loadError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center font-sans text-sm text-shimai-ivory/60">
          {loadError}
        </div>
      ) : null}
      {!ready && !loadError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center font-sans text-sm text-shimai-ivory/40">
          Cargando mapa…
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Mapa de seguimiento"
      />
    </div>
  );
}
