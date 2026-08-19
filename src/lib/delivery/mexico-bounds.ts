/** Approximate bounding box for mainland Mexico (excludes some islands). */
const MX_MIN_LAT = 14.5;
const MX_MAX_LAT = 32.8;
const MX_MIN_LNG = -118.5;
const MX_MAX_LNG = -86.5;

export function isInMexicoBounds(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= MX_MIN_LAT &&
    lat <= MX_MAX_LAT &&
    lng >= MX_MIN_LNG &&
    lng <= MX_MAX_LNG
  );
}

/** Photon / Nominatim bbox: minLon,minLat,maxLon,maxLat */
export const MEXICO_PHOTON_BBOX = `${MX_MIN_LNG},${MX_MIN_LAT},${MX_MAX_LNG},${MX_MAX_LAT}`;

export function formatCoordsLabel(lat: number, lng: number): string {
  return `Ubicación en mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

export const OUTSIDE_MEXICO_MESSAGE =
  "Esta ubicación parece estar fuera de México. Mueve el pin a tu dirección en Rioverde o alrededores.";
