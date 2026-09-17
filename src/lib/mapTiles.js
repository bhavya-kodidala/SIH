/**
 * Offline Map Tile Pre-Caching Engine for RakshaNet
 *
 * Allows pre-caching OpenStreetMap raster tiles for an immediate disaster area
 * (~3-5 km bounding box around user's location) at emergency-grade zoom levels (13, 14, 15).
 * Tiles are stored directly in Cache Storage ('rakshanet-map-tiles-v1') so Leaflet
 * renders the disaster map seamlessly when internet connectivity is severed.
 */

import { saveAppState, getAppState } from "./offlineDb";

export const TILE_CACHE_NAME = "rakshanet-map-tiles-v1";

function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom));
}

/**
 * Generate tile coordinates (z, x, y) for a bounding box around (lat, lng)
 */
export function getTileGridForArea(lat, lng, radiusKm = 3.5, zoomLevels = [13, 14, 15]) {
  const tiles = [];
  const latDelta = radiusKm / 111.0;
  // 1 deg lon = 111 * cos(lat) km
  const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;

  for (const z of zoomLevels) {
    const xMin = lon2tile(minLng, z);
    const xMax = lon2tile(maxLng, z);
    // In Web Mercator, tile y is inverted (y=0 is north)
    const yMin = lat2tile(maxLat, z);
    const yMax = lat2tile(minLat, z);

    for (let x = Math.min(xMin, xMax); x <= Math.max(xMin, xMax); x++) {
      for (let y = Math.min(yMin, yMax); y <= Math.max(yMin, yMax); y++) {
        tiles.push({ z, x, y, url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png` });
      }
    }
  }

  return tiles;
}

/**
 * Pre-cache all tiles for the user's current emergency area.
 * 
 * @param {number} lat 
 * @param {number} lng 
 * @param {Function} onProgress - callback(completedCount, totalCount)
 */
export async function cacheEmergencyAreaTiles(lat, lng, onProgress = null) {
  if (lat == null || lng == null) {
    throw new Error("Cannot cache map: valid coordinates required.");
  }

  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Cache Storage API is not supported on this browser.");
  }

  const tiles = getTileGridForArea(lat, lng, 3.5, [13, 14, 15]);
  const cache = await caches.open(TILE_CACHE_NAME);
  let completed = 0;
  let successCount = 0;

  // Fetch tiles in batches of 6 to respect browser connection limits
  const BATCH_SIZE = 6;
  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    const batch = tiles.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (tile) => {
        try {
          // Check if already in cache
          const existing = await cache.match(tile.url);
          if (!existing) {
            const resp = await fetch(tile.url, { mode: "cors" });
            if (resp && resp.status === 200) {
              await cache.put(tile.url, resp);
              successCount++;
            }
          } else {
            successCount++;
          }
        } catch {
          // Silently handle single tile fetch errors without aborting entire batch
        } finally {
          completed++;
          if (onProgress) onProgress(completed, tiles.length);
        }
      })
    );
  }

  const meta = {
    cachedAt: Date.now(),
    lat,
    lng,
    radiusKm: 3.5,
    totalTiles: tiles.length,
    cachedTiles: successCount,
  };

  await saveAppState("offline_map_meta", meta);
  return meta;
}

/**
 * Get status of currently cached emergency map area
 */
export async function getCachedMapStatus() {
  const meta = await getAppState("offline_map_meta");
  if (!meta || !meta.cachedAt) return { isCached: false, meta: null };
  return { isCached: true, meta };
}
