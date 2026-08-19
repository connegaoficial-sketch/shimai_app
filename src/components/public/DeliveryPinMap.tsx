"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import {
  isInMexicoBounds,
  OUTSIDE_MEXICO_MESSAGE,
} from "@/lib/delivery/mexico-bounds";
import { isMapAlive, safeInvalidateSize, safeSetMarkerLatLng } from "@/lib/maps/leaflet-guards";
import { addDeliveryTiles } from "@/lib/maps/tiles";
import { cn } from "@/lib/utils";

const FALLBACK_CENTER = { lat: 21.916146, lng: -99.9900263, zoom: 14 };

function pinIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:9999px 9999px 9999px 0;background:#C9A45C;border:2px solid #1a1a1a;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

export type MapPinPosition = {
  lat: number;
  lng: number;
};

type DeliveryPinMapProps = {
  position: MapPinPosition | null;
  onPositionChange: (position: MapPinPosition, source: "map" | "gps") => void;
  disabled?: boolean;
  className?: string;
};

export function DeliveryPinMap({
  position,
  onPositionChange,
  disabled = false,
  className,
}: DeliveryPinMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  const disabledRef = useRef(disabled);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => {
    disabledRef.current = disabled;
    const marker = markerRef.current;
    if (!marker?.dragging) return;
    if (disabled) marker.dragging.disable();
    else marker.dragging.enable();
  }, [disabled]);

  useEffect(() => {
    void fetch("/api/delivery/map-center")
      .then((res) => res.json())
      .then((data: { lat?: number; lng?: number; zoom?: number }) => {
        const map = mapRef.current;
        if (
          !isMapAlive(map) ||
          typeof data.lat !== "number" ||
          typeof data.lng !== "number" ||
          !isInMexicoBounds(data.lat, data.lng)
        ) {
          return;
        }
        map.setView([data.lat, data.lng], data.zoom ?? 14);
      })
      .catch(() => undefined);
  }, []);

  const setMarkerAt = useCallback((lat: number, lng: number, pan = true) => {
    const map = mapRef.current;
    if (!isMapAlive(map)) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        icon: pinIcon(),
        draggable: !disabledRef.current,
      }).addTo(map);

      markerRef.current.on("dragend", () => {
        const ll = markerRef.current?.getLatLng();
        if (!ll) return;
        if (!isInMexicoBounds(ll.lat, ll.lng)) {
          setGeoError(OUTSIDE_MEXICO_MESSAGE);
          return;
        }
        setGeoError(null);
        onPositionChangeRef.current({ lat: ll.lat, lng: ll.lng }, "map");
      });
    } else {
      safeSetMarkerLatLng(markerRef.current, lat, lng);
    }

    if (disabledRef.current && markerRef.current.dragging) {
      markerRef.current.dragging.disable();
    }

    if (pan) {
      try {
        safeInvalidateSize(map);
        map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: false });
      } catch {
        // map torn down mid-update
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(
      [FALLBACK_CENTER.lat, FALLBACK_CENTER.lng],
      FALLBACK_CENTER.zoom,
    );

    addDeliveryTiles(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("click", (event) => {
      if (disabledRef.current) return;
      const { lat, lng } = event.latlng;
      if (!isInMexicoBounds(lat, lng)) {
        setGeoError(OUTSIDE_MEXICO_MESSAGE);
        return;
      }
      setGeoError(null);
      setMarkerAt(lat, lng, false);
      onPositionChangeRef.current({ lat, lng }, "map");
    });

    mapRef.current = map;

    const refreshSize = () => safeInvalidateSize(mapRef.current);
    map.whenReady(refreshSize);
    const raf = window.requestAnimationFrame(refreshSize);
    const timeout = window.setTimeout(refreshSize, 250);
    window.addEventListener("resize", refreshSize);
    window.addEventListener("orientationchange", refreshSize);
    window.visualViewport?.addEventListener("resize", refreshSize);

    const observer =
      typeof ResizeObserver !== "undefined" && containerRef.current
        ? new ResizeObserver(refreshSize)
        : null;
    if (observer && containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      window.removeEventListener("resize", refreshSize);
      window.removeEventListener("orientationchange", refreshSize);
      window.visualViewport?.removeEventListener("resize", refreshSize);
      observer?.disconnect();
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [setMarkerAt]);

  useEffect(() => {
    if (!position || !mapRef.current) return;
    const map = mapRef.current;
    const { lat, lng } = position;

    const apply = () => {
      if (!isMapAlive(mapRef.current)) return;
      setMarkerAt(lat, lng, true);
    };

    if (map.whenReady) map.whenReady(apply);
    else apply();
  }, [position, setMarkerAt]);

  function useMyLocation() {
    if (disabled || !navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }

    setLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (result) => {
        const lat = result.coords.latitude;
        const lng = result.coords.longitude;

        if (!isInMexicoBounds(lat, lng)) {
          setLocating(false);
          setGeoError(
            "Tu GPS reporta una ubicación fuera de México. Coloca el pin manualmente en el mapa.",
          );
          return;
        }

        setMarkerAt(lat, lng, true);
        onPositionChange({ lat, lng }, "gps");
        setLocating(false);
        window.setTimeout(() => safeInvalidateSize(mapRef.current), 80);
        window.setTimeout(() => safeInvalidateSize(mapRef.current), 320);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Activa el permiso de ubicación en tu navegador.");
        } else {
          setGeoError(
            "No pudimos obtener tu ubicación. Coloca el pin manualmente en el mapa.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || locating}
          onClick={useMyLocation}
          className="font-sans text-xs tracking-wide"
        >
          {locating ? "Obteniendo ubicación…" : "Usar mi ubicación"}
        </Button>
        <p className="font-sans text-[11px] text-shimai-ivory/45">
          Verifica que el pin quede en tu calle y arrástralo si hace falta
        </p>
      </div>

      {geoError ? (
        <p className="font-sans text-xs text-seal-red/90" role="alert">
          {geoError}
        </p>
      ) : null}

      <div
        className={cn(
          "relative h-56 w-full overflow-hidden rounded-md border border-white/[0.12] bg-[#e8e4dc] sm:h-64",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <div
          ref={containerRef}
          className="absolute inset-0 h-full w-full"
          aria-label="Mapa para ubicar tu entrega"
        />
      </div>

      {position ? (
        <p className="font-sans text-[11px] text-shimai-ivory/40">
          Pin: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      ) : null}
    </div>
  );
}
