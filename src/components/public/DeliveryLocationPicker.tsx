"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

import {
  AddressAutocomplete,
  type GeocodeSuggestion,
} from "@/components/public/AddressAutocomplete";
import { Input } from "@/components/ui/input";
import {
  formatCoordsLabel,
  isInMexicoBounds,
  OUTSIDE_MEXICO_MESSAGE,
} from "@/lib/delivery/mexico-bounds";
import { cn } from "@/lib/utils";

export type DeliveryLocation = {
  lat: number;
  lng: number;
  label: string;
  source: "search" | "map" | "gps";
};

type MapPinPosition = {
  lat: number;
  lng: number;
};

type DeliveryLocationPickerProps = {
  addressText: string;
  streetNumber: string;
  onAddressTextChange: (text: string) => void;
  onStreetNumberChange: (text: string) => void;
  onLocationSelect: (location: DeliveryLocation) => void;
  onLocationClear: () => void;
  disabled?: boolean;
  hasCoordinates: boolean;
};

type ReverseGeocodeResult = {
  label: string | null;
  houseNumber: string | null;
  outsideMexico: boolean;
};

const DeliveryPinMap = dynamic(
  () =>
    import("@/components/public/DeliveryPinMap").then(
      (mod) => mod.DeliveryPinMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center border border-white/[0.08] bg-shimai-surface font-sans text-sm text-shimai-ivory/40">
        Cargando mapa…
      </div>
    ),
  },
);

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  if (!isInMexicoBounds(lat, lng)) {
    return { label: null, houseNumber: null, outsideMexico: true };
  }

  try {
    const response = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
    const data = (await response.json()) as {
      label?: string | null;
      house_number?: string | null;
      outside_mexico?: boolean;
    };
    return {
      label: data.label ?? null,
      houseNumber: data.house_number ?? null,
      outsideMexico: data.outside_mexico === true,
    };
  } catch {
    return { label: null, houseNumber: null, outsideMexico: false };
  }
}

export function DeliveryLocationPicker({
  addressText,
  streetNumber,
  onAddressTextChange,
  onStreetNumberChange,
  onLocationSelect,
  onLocationClear,
  disabled,
  hasCoordinates,
}: DeliveryLocationPickerProps) {
  const [showMap, setShowMap] = useState(false);
  const [mapPin, setMapPin] = useState<MapPinPosition | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const confirmSeqRef = useRef(0);

  const confirmMapPin = useCallback(
    async (position: MapPinPosition, source: "map" | "gps") => {
      if (!isInMexicoBounds(position.lat, position.lng)) {
        setLocationError(OUTSIDE_MEXICO_MESSAGE);
        onLocationClear();
        return;
      }

      const seq = ++confirmSeqRef.current;
      setMapPin(position);
      setResolving(true);
      setLocationError(null);

      try {
        const { label: reversed, houseNumber, outsideMexico } =
          await reverseGeocode(position.lat, position.lng);

        if (seq !== confirmSeqRef.current) return;

        if (outsideMexico) {
          setLocationError(OUTSIDE_MEXICO_MESSAGE);
          onLocationClear();
          return;
        }

        const fallback = formatCoordsLabel(position.lat, position.lng);
        const label = reversed ?? fallback;

        onAddressTextChange(label);
        if (houseNumber) {
          onStreetNumberChange(houseNumber);
        }

        onLocationSelect({
          lat: position.lat,
          lng: position.lng,
          label,
          source,
        });
      } finally {
        if (seq === confirmSeqRef.current) {
          setResolving(false);
        }
      }
    },
    [
      onAddressTextChange,
      onLocationClear,
      onLocationSelect,
      onStreetNumberChange,
    ],
  );

  function handleSearchSelect(place: GeocodeSuggestion) {
    if (!isInMexicoBounds(place.lat, place.lng)) {
      setLocationError(OUTSIDE_MEXICO_MESSAGE);
      return;
    }

    setShowMap(false);
    setMapPin(null);
    setLocationError(null);
    onStreetNumberChange("");
    onLocationSelect({
      lat: place.lat,
      lng: place.lng,
      label: place.label,
      source: "search",
    });
  }

  function handleMapPositionChange(
    position: MapPinPosition,
    source: "map" | "gps",
  ) {
    void confirmMapPin(position, source);
  }

  return (
    <div className="space-y-3">
      <AddressAutocomplete
        value={addressText}
        disabled={disabled}
        committed={hasCoordinates}
        placeholder="Calle y colonia…"
        onChangeText={(text) => {
          onAddressTextChange(text);
          if (!hasCoordinates) {
            onLocationClear();
            setMapPin(null);
          }
          setLocationError(null);
        }}
        onSelect={handleSearchSelect}
        onNoResults={() => setShowMap(true)}
      />

      <label className="block space-y-2">
        <span className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
          Número exterior
        </span>
        <Input
          value={streetNumber}
          disabled={disabled}
          placeholder="Ej. 123, Mz 4 Lt 2, S/N"
          inputMode="text"
          autoComplete="off"
          onChange={(e) => onStreetNumberChange(e.target.value)}
        />
      </label>

      {hasCoordinates ? (
        <p className="font-sans text-[11px] text-shimai-ivory/45">
          Puedes editar calle y número; la ubicación del pin se mantiene.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowMap((open) => !open)}
          className={cn(
            "font-sans text-xs text-shimai-gold/90 underline-offset-2 hover:text-shimai-gold hover:underline",
            showMap && "text-shimai-gold",
          )}
        >
          {showMap ? "Ocultar mapa" : "¿No encuentras tu dirección? Ubica en el mapa"}
        </button>
        {hasCoordinates ? (
          <span className="font-sans text-[11px] text-shimai-gold/70">
            Ubicación confirmada
          </span>
        ) : null}
      </div>

      {locationError ? (
        <p className="font-sans text-xs text-seal-red/90" role="alert">
          {locationError}
        </p>
      ) : null}

      {showMap ? (
        <DeliveryPinMap
          position={mapPin}
          disabled={disabled || resolving}
          onPositionChange={handleMapPositionChange}
        />
      ) : null}

      {resolving ? (
        <p className="font-sans text-xs text-shimai-ivory/40">
          Confirmando ubicación…
        </p>
      ) : null}
    </div>
  );
}
