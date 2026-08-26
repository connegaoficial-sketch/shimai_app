/**
 * Opens native Google Maps navigation (recommended over in-app Directions).
 * On mobile this launches the Google Maps app with turn-by-turn routing.
 */
export function buildGoogleMapsDirectionsUrl(input: {
  destinationLat: number;
  destinationLng: number;
  originLat?: number | null;
  originLng?: number | null;
}): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "destination",
    `${input.destinationLat},${input.destinationLng}`,
  );
  url.searchParams.set("travelmode", "driving");

  if (
    typeof input.originLat === "number" &&
    typeof input.originLng === "number" &&
    Number.isFinite(input.originLat) &&
    Number.isFinite(input.originLng)
  ) {
    url.searchParams.set("origin", `${input.originLat},${input.originLng}`);
  }

  return url.toString();
}

export function openGoogleMapsDirections(input: {
  destinationLat: number;
  destinationLng: number;
  originLat?: number | null;
  originLng?: number | null;
}): void {
  const href = buildGoogleMapsDirectionsUrl(input);
  window.open(href, "_blank", "noopener,noreferrer");
}
