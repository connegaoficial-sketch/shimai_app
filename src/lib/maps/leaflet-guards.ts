import type { Map as LeafletMap, Marker } from "leaflet";

/** Guard map/marker ops when React strict mode or route changes tear down the map. */
export function isMapAlive(
  map: LeafletMap | null | undefined,
): map is LeafletMap {
  if (!map) return false;
  try {
    const container = map.getContainer();
    return Boolean(container?.isConnected);
  } catch {
    return false;
  }
}

export function safeInvalidateSize(map: LeafletMap | null | undefined): void {
  if (!isMapAlive(map)) return;
  try {
    map.invalidateSize({ animate: false, pan: false });
  } catch {
    // map torn down
  }
}

export function safeSetMarkerLatLng(
  marker: Marker | null,
  lat: number,
  lng: number,
): boolean {
  if (!marker) return false;
  try {
    marker.setLatLng([lat, lng]);
    return true;
  } catch {
    return false;
  }
}

export function safeFitBounds(
  map: LeafletMap | null,
  points: [number, number][],
): boolean {
  if (!isMapAlive(map) || points.length === 0) return false;
  try {
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15));
      return true;
    }
    map.fitBounds(points, { padding: [48, 48], maxZoom: 16 });
    return true;
  } catch {
    return false;
  }
}
