/**
 * Offline Map Tile Pre-Caching Engine for RakshaNet
 *
 * Allows pre-caching OpenStreetMap raster tiles for an immediate disaster area
 * (1 km, 3 km, or 5 km radius around user's real GPS coordinates) at emergency-grade
 * zoom levels (13, 14, 15).
 *
 * Tiles are stored directly in Cache Storage ('rakshanet-map-tiles-v1') so Leaflet
 * renders the disaster map seamlessly when internet connectivity is severed.
 */

import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { saveAppState, getAppState, cacheFacilities } from "./offlineDb";
import { fetchNearbyFacilities } from "./facilities";

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
export function getTileGridForArea(lat, lng, radiusKm = 3, zoomLevels = [13, 14, 15]) {
  if (lat == null || lng == null) return [];
  const tiles = [];
  const latDelta = radiusKm / 111.0;
  // 1 deg lon = 111 * cos(lat) km
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta = radiusKm / (111.0 * Math.max(0.01, cosLat));

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

    const xStart = Math.min(xMin, xMax);
    const xEnd = Math.max(xMin, xMax);
    const yStart = Math.min(yMin, yMax);
    const yEnd = Math.max(yMin, yMax);

    for (let x = xStart; x <= xEnd; x++) {
      for (let y = yStart; y <= yEnd; y++) {
        tiles.push({ z, x, y, url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png` });
      }
    }
  }

  return tiles;
}

/**
 * Estimate tile count and storage size for a chosen radius
 */
export function estimateTileCountAndSize(lat, lng, radiusKm = 3, zoomLevels = [13, 14, 15]) {
  if (lat == null || lng == null) return { count: 0, estMb: "0.0", estBytes: 0 };
  const tiles = getTileGridForArea(lat, lng, radiusKm, zoomLevels);
  const count = tiles.length;
  // Standard OSM PNG tile is approx 24-28 KB
  const estBytes = count * 26 * 1024;
  const estMb = (estBytes / (1024 * 1024)).toFixed(1);
  return { count, estMb, estBytes };
}

/**
 * Pre-cache all tiles for the user's real GPS emergency area.
 * Also pre-fetches and caches nearby emergency facilities (hospitals, fire stations, police, shelters).
 * 
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} radiusKm 
 * @param {Function} onProgress - callback({ completed, total, successCount, phase })
 */
export async function cacheEmergencyAreaTiles(lat, lng, radiusKm = 3, onProgress = null) {
  if (lat == null || lng == null) {
    throw new Error("Cannot cache map: valid GPS coordinates required.");
  }

  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Cache Storage API is not supported on this device/browser.");
  }

  const tiles = getTileGridForArea(lat, lng, radiusKm, [13, 14, 15]);
  const cache = await caches.open(TILE_CACHE_NAME);
  let completed = 0;
  let successCount = 0;
  let totalBytes = 0;

  if (onProgress) {
    onProgress({ completed: 0, total: tiles.length, successCount: 0, phase: "tiles" });
  }

  // Fetch tiles in batches of 4 to respect browser connection limits & avoid throttling
  const BATCH_SIZE = 4;
  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    const batch = tiles.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (tile) => {
        try {
          const existing = await cache.match(tile.url);
          if (!existing) {
            const resp = await fetch(tile.url, { mode: "cors" });
            if (resp && resp.status === 200) {
              const clone = resp.clone();
              const blob = await clone.blob();
              totalBytes += blob.size;
              await cache.put(tile.url, resp);
              successCount++;
            }
          } else {
            successCount++;
            try {
              const blob = await existing.blob();
              totalBytes += blob.size;
            } catch {
              totalBytes += 25 * 1024;
            }
          }
        } catch (err) {
          console.warn("Tile fetch notice:", tile.url, err);
        } finally {
          completed++;
          if (onProgress) {
            onProgress({
              completed,
              total: tiles.length,
              successCount,
              phase: "tiles",
            });
          }
        }
      })
    );
  }

  // Pre-fetch & cache emergency facilities for the area
  let facilityCount = 0;
  if (onProgress) {
    onProgress({
      completed: tiles.length,
      total: tiles.length,
      successCount,
      phase: "facilities",
    });
  }

  try {
    const facilities = await fetchNearbyFacilities(lat, lng);
    if (facilities && facilities.length > 0) {
      facilityCount = facilities.length;
      await cacheFacilities(facilities, { lat, lng });
    }
  } catch (facErr) {
    console.warn("Facility pre-caching non-fatal warning:", facErr);
  }

  const meta = {
    cachedAt: Date.now(),
    lat,
    lng,
    radiusKm,
    totalTiles: tiles.length,
    cachedTiles: successCount,
    sizeBytes: totalBytes,
    facilityCount,
  };

  await saveAppState("offline_map_meta", meta);
  return meta;
}

/**
 * Get status of currently cached emergency map area
 */
export async function getCachedMapStatus() {
  try {
    const meta = await getAppState("offline_map_meta");
    if (!meta || !meta.cachedAt) return { isCached: false, meta: null };
    return { isCached: true, meta };
  } catch {
    return { isCached: false, meta: null };
  }
}

/**
 * Clear the offline map tile cache and metadata
 */
export async function clearOfflineMapCache() {
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      await caches.delete(TILE_CACHE_NAME);
    } catch (err) {
      console.warn("Failed to delete tile cache:", err);
    }
  }
  await saveAppState("offline_map_meta", null);
  return { isCached: false, meta: null };
}

/**
 * Offline-First Leaflet Tile Layer
 *
 * Checks Cache Storage ('rakshanet-map-tiles-v1') first before network requests.
 * If offline and tile is not in cache, displays a clean placeholder instead of broken images.
 */
export function OfflineTileLayer({ attribution, maxZoom = 19 }) {
  const map = useMap();

  useEffect(() => {
    const CustomLayer = L.TileLayer.extend({
      createTile(coords, done) {
        const tile = document.createElement("img");
        tile.alt = "";
        tile.setAttribute("role", "presentation");

        const url = this.getTileUrl(coords);
        // Normalize subdomain if any
        const normalizedUrl = url.replace(/https:\/\/[abc]\.tile\.openstreetmap\.org/, "https://tile.openstreetmap.org");

        let isDone = false;
        const markDone = (err, t) => {
          if (!isDone) {
            isDone = true;
            done(err, t);
          }
        };

        const tryCache = async () => {
          if (typeof window !== "undefined" && "caches" in window) {
            try {
              const cache = await caches.open(TILE_CACHE_NAME);
              const match = (await cache.match(normalizedUrl)) || (await cache.match(url));
              if (match) {
                const blob = await match.blob();
                tile.src = URL.createObjectURL(blob);
                markDone(null, tile);
                return true;
              }
            } catch {
              // Ignore cache error and proceed to network
            }
          }
          return false;
        };

        tryCache().then((found) => {
          if (found) return;

          tile.onload = () => markDone(null, tile);
          tile.onerror = () => {
            // When offline and tile wasn't pre-cached, render clean placeholder so map isn't broken
            tile.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='256' height='256' fill='%23EEF2F4'/><path d='M110 128 L146 128 M128 110 L128 146' stroke='%23CAD5DE' stroke-width='2'/><text x='50%' y='68%' dominant-baseline='middle' text-anchor='middle' fill='%2396A3AF' font-size='10' font-family='sans-serif'>Area not cached</text></svg>";
            markDone(null, tile);
          };
          tile.src = normalizedUrl;
        });

        return tile;
      }
    });

    const layer = new CustomLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: attribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom,
      crossOrigin: true,
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, attribution, maxZoom]);

  return null;
}
