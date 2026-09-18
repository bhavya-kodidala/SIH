/**
 * RakshaNet Emergency Service Worker
 *
 * Provides true offline application shell resilience:
 * - App shell precaching & navigation fallback to /index.html
 * - Dedicated offline map tile cache ('rakshanet-map-tiles-v1') for OpenStreetMap
 * - Stale-while-revalidate for local static assets
 * - Graceful offline fallbacks for emergency APIs
 */

const APP_CACHE = "rakshanet-app-shell-v4";
const TILE_CACHE = "rakshanet-map-tiles-v1";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install: precache app shell core
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn("ServiceWorker shell precache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up outdated version caches (while preserving map tile cache)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== APP_CACHE && key !== TILE_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch dispatcher
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST to APIs)
  if (request.method !== "GET") {
    return;
  }

  // 1. Navigation requests (App Shell fallback)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(APP_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/index.html") || caches.match("/");
        })
    );
    return;
  }

  // 2. OpenStreetMap Tile Cache Handling
  if (url.hostname.includes("tile.openstreetmap.org")) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        // Try cache first for fastest offline map rendering; normalize subdomain
        const normalizedUrl = request.url.replace(/https:\/\/[abc]\.tile\.openstreetmap\.org/, "https://tile.openstreetmap.org");
        const cachedResponse = (await cache.match(request)) || (await cache.match(normalizedUrl));
        if (cachedResponse) {
          // In background, revalidate if online
          if (navigator.onLine) {
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  cache.put(normalizedUrl, networkResponse);
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        // Not in cache: fetch from network and store
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(normalizedUrl, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // When completely offline and tile wasn't pre-cached
            return new Response("", { status: 404, statusText: "Tile offline" });
          });
      })
    );
    return;
  }

  // 3. Live External APIs (Nominatim, Overpass, Open-Meteo)
  // Network-first with cache fallback
  if (
    url.hostname.includes("open-meteo.com") ||
    url.hostname.includes("overpass-api.de") ||
    url.hostname.includes("nominatim.openstreetmap.org")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(APP_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4. Local origin static resources (JS chunks, CSS, icons, fonts)
  // Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(APP_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
