"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type TrackerMapProps = {
  customer: { lat: number; lng: number } | null;
  driver: { lat: number; lng: number } | null;
};

const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function goldIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:#C9A45C;border:2px solid #F4EBDD;box-shadow:0 0 0 4px rgba(201,164,92,0.25)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function sakuraIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:9999px;background:#E8A5B5;border:2px solid #F4EBDD;opacity:0.95"></div>`,
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

    const center = driver ?? customer ?? { lat: 19.4326, lng: -99.1332 };
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([center.lat, center.lng], 15);

    L.tileLayer(DARK_TILES, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      driverMarkerRef.current = null;
      customerMarkerRef.current = null;
    };
    // Intentionally mount once — markers update in separate effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !customer) return;

    if (!customerMarkerRef.current) {
      customerMarkerRef.current = L.marker([customer.lat, customer.lng], {
        icon: sakuraIcon(),
        interactive: false,
      }).addTo(map);
    } else {
      customerMarkerRef.current.setLatLng([customer.lat, customer.lng]);
    }
  }, [customer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driver) return;

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([driver.lat, driver.lng], {
        icon: goldIcon(),
      }).addTo(map);
      map.panTo([driver.lat, driver.lng], { animate: true });
    } else {
      const next = L.latLng(driver.lat, driver.lng);
      driverMarkerRef.current.setLatLng(next);
      map.panTo(next, { animate: true, duration: 0.8 });
    }
  }, [driver]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points: L.LatLngExpression[] = [];
    if (customer) points.push([customer.lat, customer.lng]);
    if (driver) points.push([driver.lat, driver.lng]);
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
    }
  }, [customer, driver]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-shimai-surface"
      aria-label="Mapa de seguimiento"
    />
  );
}
