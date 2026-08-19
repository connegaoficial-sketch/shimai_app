"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  isMapAlive,
  safeFitBounds,
  safeInvalidateSize,
  safeSetMarkerLatLng,
} from "@/lib/maps/leaflet-guards";
import { addDeliveryTiles } from "@/lib/maps/tiles";

type TrackerMapProps = {
  customer: { lat: number; lng: number } | null;
  driver: { lat: number; lng: number } | null;
};

const FALLBACK_CENTER = { lat: 21.916146, lng: -99.9900263 };

function goldIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:#C9A45C;border:2px solid #1a1a1a;box-shadow:0 0 0 4px rgba(201,164,92,0.25)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function sakuraIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:9999px;background:#E8A5B5;border:2px solid #1a1a1a;opacity:0.95"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export function TrackerMap({ customer, driver }: TrackerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = driver ?? customer ?? FALLBACK_CENTER;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([center.lat, center.lng], 15);

    addDeliveryTiles(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    map.whenReady(() => safeInvalidateSize(map));
    const timeout = window.setTimeout(() => safeInvalidateSize(map), 250);

    return () => {
      window.clearTimeout(timeout);
      driverMarkerRef.current = null;
      customerMarkerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!isMapAlive(map)) return;

    const sync = () => {
      if (!isMapAlive(mapRef.current)) return;
      const liveMap = mapRef.current!;

      if (customer) {
        if (!customerMarkerRef.current) {
          customerMarkerRef.current = L.marker([customer.lat, customer.lng], {
            icon: sakuraIcon(),
            interactive: false,
          }).addTo(liveMap);
        } else {
          safeSetMarkerLatLng(
            customerMarkerRef.current,
            customer.lat,
            customer.lng,
          );
        }
      }

      if (driver) {
        if (!driverMarkerRef.current) {
          driverMarkerRef.current = L.marker([driver.lat, driver.lng], {
            icon: goldIcon(),
          }).addTo(liveMap);
        } else {
          safeSetMarkerLatLng(driverMarkerRef.current, driver.lat, driver.lng);
        }
      }

      const points: [number, number][] = [];
      if (customer) points.push([customer.lat, customer.lng]);
      if (driver) points.push([driver.lat, driver.lng]);

      if (points.length >= 2) {
        safeFitBounds(liveMap, points);
      } else if (points.length === 1) {
        liveMap.setView(points[0], Math.max(liveMap.getZoom(), 15));
      }
    };

    if (map.whenReady) {
      map.whenReady(sync);
    } else {
      sync();
    }
  }, [customer, driver]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-white"
      aria-label="Mapa de seguimiento"
    />
  );
}
