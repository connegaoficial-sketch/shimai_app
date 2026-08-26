/** Client-side loader for Google Maps JavaScript API (singleton). */

type GoogleMapsWindow = Window & {
  google?: typeof google;
  __shimaiGoogleMapsPromise?: Promise<typeof google.maps>;
};

export async function loadGoogleMaps(): Promise<typeof google.maps> {
  const w = window as GoogleMapsWindow;
  if (w.google?.maps) return w.google.maps;
  if (w.__shimaiGoogleMapsPromise) return w.__shimaiGoogleMapsPromise;

  w.__shimaiGoogleMapsPromise = (async () => {
    const res = await fetch("/api/maps/browser-key");
    if (!res.ok) {
      throw new Error("No se pudo cargar la clave de Google Maps");
    }
    const data = (await res.json()) as { apiKey?: string; error?: string };
    const apiKey = data.apiKey?.trim() ?? "";
    if (!apiKey) {
      throw new Error(data.error ?? "Falta GOOGLE_MAPS_API_KEY");
    }

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[data-shimai-google-maps]",
      );
      if (existing) {
        if (w.google?.maps) {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Error al cargar Google Maps")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.dataset.shimaiGoogleMaps = "1";
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=es&region=MX&v=weekly`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Error al cargar Google Maps"));
      document.head.appendChild(script);
    });

    if (!w.google?.maps) {
      throw new Error("Google Maps no inicializó");
    }
    return w.google.maps;
  })();

  try {
    return await w.__shimaiGoogleMapsPromise;
  } catch (error) {
    w.__shimaiGoogleMapsPromise = undefined;
    throw error;
  }
}

/** Subtle dark style so the pin reads against SHIMAI UI. */
export const SHIMAI_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1c1c1c" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#c9a45c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1c1c1c" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#3a3a3a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1620" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#222222" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1a241a" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#444444" }],
  },
];
