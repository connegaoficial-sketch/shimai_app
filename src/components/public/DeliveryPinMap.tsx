"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  isInMexicoBounds,
  OUTSIDE_MEXICO_MESSAGE,
} from "@/lib/delivery/mexico-bounds";
import {
  loadGoogleMaps,
  SHIMAI_MAP_STYLES,
} from "@/lib/maps/load-google-maps";
import { cn } from "@/lib/utils";

const FALLBACK_CENTER = { lat: 21.916146, lng: -99.9900263, zoom: 14 };

const PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path fill="#C9A45C" stroke="#1a1a1a" stroke-width="1.5"
      d="M14 1c-6.6 0-12 5.2-12 11.6 0 8.7 12 21.4 12 21.4S26 21.3 26 12.6C26 6.2 20.6 1 14 1z"/>
    <circle cx="14" cy="12.5" r="4.2" fill="#1a1a1a"/>
  </svg>`,
);

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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapsApiRef = useRef<typeof google.maps | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  const disabledRef = useRef(disabled);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => {
    disabledRef.current = disabled;
    markerRef.current?.setDraggable(!disabled);
  }, [disabled]);

  const setMarkerAt = useCallback((lat: number, lng: number, pan = true) => {
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!map || !maps) return;

    const latLng = { lat, lng };

    if (!markerRef.current) {
      markerRef.current = new maps.Marker({
        map,
        position: latLng,
        draggable: !disabledRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${PIN_SVG}`,
          scaledSize: new maps.Size(28, 36),
          anchor: new maps.Point(14, 36),
        },
        title: "Tu entrega",
      });

      markerRef.current.addListener("dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (!pos) return;
        const next = { lat: pos.lat(), lng: pos.lng() };
        if (!isInMexicoBounds(next.lat, next.lng)) {
          setGeoError(OUTSIDE_MEXICO_MESSAGE);
          return;
        }
        setGeoError(null);
        onPositionChangeRef.current(next, "map");
      });
    } else {
      markerRef.current.setPosition(latLng);
    }

    if (pan) {
      map.panTo(latLng);
      const zoom = map.getZoom() ?? FALLBACK_CENTER.zoom;
      if (zoom < 16) map.setZoom(16);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let clickListener: google.maps.MapsEventListener | null = null;

    async function init() {
      if (!containerRef.current) return;

      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;
        mapsApiRef.current = maps;

        let center = {
          lat: FALLBACK_CENTER.lat,
          lng: FALLBACK_CENTER.lng,
        };
        let zoom = FALLBACK_CENTER.zoom;

        try {
          const centerRes = await fetch("/api/delivery/map-center");
          if (centerRes.ok) {
            const data = (await centerRes.json()) as {
              lat?: number;
              lng?: number;
              zoom?: number;
            };
            if (
              typeof data.lat === "number" &&
              typeof data.lng === "number" &&
              isInMexicoBounds(data.lat, data.lng)
            ) {
              center = { lat: data.lat, lng: data.lng };
              zoom = data.zoom ?? 14;
            }
          }
        } catch {
          // keep fallback
        }

        if (cancelled || !containerRef.current) return;

        const map = new maps.Map(containerRef.current, {
          center,
          zoom,
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

        clickListener = map.addListener(
          "click",
          (event: google.maps.MapMouseEvent) => {
            if (disabledRef.current) return;
            const lat = event.latLng?.lat();
            const lng = event.latLng?.lng();
            if (typeof lat !== "number" || typeof lng !== "number") return;
            if (!isInMexicoBounds(lat, lng)) {
              setGeoError(OUTSIDE_MEXICO_MESSAGE);
              return;
            }
            setGeoError(null);
            setMarkerAt(lat, lng, false);
            onPositionChangeRef.current({ lat, lng }, "map");
          },
        );

        setReady(true);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        console.error("[DeliveryPinMap]", error);
        setLoadError(
          "No se pudo cargar Google Maps. Activa Maps JavaScript API en Google Cloud (Axius).",
        );
      }
    }

    void init();

    return () => {
      cancelled = true;
      clickListener?.remove();
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [setMarkerAt]);

  useEffect(() => {
    if (!ready || !position) return;
    setMarkerAt(position.lat, position.lng, true);
  }, [position, ready, setMarkerAt]);

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
          disabled={disabled || locating || !ready}
          onClick={useMyLocation}
          className="font-sans text-xs tracking-wide"
        >
          {locating ? "Obteniendo ubicación…" : "Usar mi ubicación"}
        </Button>
        <p className="font-sans text-[11px] text-shimai-ivory/45">
          Verifica que el pin quede en tu calle y arrástralo si hace falta
        </p>
      </div>

      {loadError ? (
        <p className="font-sans text-xs text-seal-red/90" role="alert">
          {loadError}
        </p>
      ) : null}

      {geoError ? (
        <p className="font-sans text-xs text-seal-red/90" role="alert">
          {geoError}
        </p>
      ) : null}

      <div
        className={cn(
          "relative h-56 w-full overflow-hidden rounded-md border border-white/[0.12] bg-[#1c1c1c] sm:h-64",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {!ready && !loadError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center font-sans text-sm text-shimai-ivory/40">
            Cargando Google Maps…
          </div>
        ) : null}
        <div
          ref={containerRef}
          className="absolute inset-0 h-full w-full"
          aria-label="Mapa para ubicar tu entrega"
        />
      </div>

      {position ? (
        <p className="font-sans text-[11px] text-shimai-ivory/40">
          Pin: {position.lat.toFixed(5)}, {position.lng.toFixed(5)} · Google Maps
        </p>
      ) : null}
    </div>
  );
}
