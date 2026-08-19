import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/** Non-retina tiles — `{r}` / @2x often fail on mobile and leave a blank map. */
const CARTO_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export function addDeliveryTiles(map: LeafletMap): L.TileLayer {
  let swapped = false;
  const layer = L.tileLayer(CARTO_TILES, {
    attribution: TILE_ATTR,
    maxZoom: 19,
    detectRetina: false,
    updateWhenIdle: true,
    keepBuffer: 2,
  });

  layer.on("tileerror", () => {
    if (swapped) return;
    swapped = true;
    map.removeLayer(layer);
    L.tileLayer(OSM_TILES, {
      attribution: TILE_ATTR,
      maxZoom: 19,
      detectRetina: false,
    }).addTo(map);
  });

  layer.addTo(map);
  return layer;
}
