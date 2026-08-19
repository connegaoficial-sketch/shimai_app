"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type GeocodeSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type AddressAutocompleteProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (place: GeocodeSuggestion) => void;
  onNoResults?: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** When true, the address is already pinned — do not keep suggesting other places. */
  committed?: boolean;
};

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  onNoResults,
  disabled,
  placeholder = "Busca tu dirección…",
  committed = false,
}: AddressAutocompleteProps) {
  const listId = useId();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const originRef = useRef<"user" | "external">("external");

  useEffect(() => {
    if (value === query) return;
    originRef.current = "external";
    setQuery(value);
    setSuggestions([]);
    setOpen(false);
    setSearched(false);
    abortRef.current?.abort();
    setLoading(false);
  }, [query, value]);

  useEffect(() => {
    if (!committed) return;
    setSuggestions([]);
    setOpen(false);
    setSearched(false);
    abortRef.current?.abort();
    setLoading(false);
  }, [committed]);

  useEffect(() => {
    if (originRef.current !== "user" || committed) return;

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setSearched(false);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as {
          results?: GeocodeSuggestion[];
        };
        if (originRef.current !== "user") return;
        setSuggestions(data.results ?? []);
        setSearched(true);
        setOpen(true);
        if ((data.results ?? []).length === 0) {
          onNoResults?.();
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setSearched(true);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [committed, onNoResults, query]);

  return (
    <div className="relative">
      <Input
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onChange={(e) => {
          const next = e.target.value;
          originRef.current = "user";
          setQuery(next);
          onChangeText(next);
        }}
        onFocus={() => {
          if (committed) return;
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {loading ? (
        <p className="mt-1 font-sans text-[11px] text-shimai-ivory/40">
          Buscando direcciones…
        </p>
      ) : null}
      {!loading && searched && open && suggestions.length === 0 ? (
        <p className="mt-1 font-sans text-[11px] text-shimai-ivory/45">
          Sin coincidencias. Puedes ubicar tu entrega en el mapa abajo.
        </p>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-white/[0.1] bg-shimai-black shadow-xl"
        >
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                className={cn(
                  "w-full px-3 py-2.5 text-left font-sans text-sm text-shimai-ivory/90",
                  "hover:bg-shimai-gold/10 hover:text-shimai-gold",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  originRef.current = "external";
                  setQuery(item.label);
                  onChangeText(item.label);
                  onSelect(item);
                  setOpen(false);
                  setSuggestions([]);
                  setSearched(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
