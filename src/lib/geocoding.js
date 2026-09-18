/**
 * Geocoding utilities using OpenStreetMap Nominatim — free, no API key.
 * Covers Indian address structures comprehensively (road, hamlet, taluk,
 * district, state, pincode). Never fabricates data; returns null / [] on
 * any failure so the UI can show "Address unavailable".
 */

/* ─── Internal: Build full address label from a Nominatim address object ── */
/**
 * Produces a complete, human-readable Indian address string from the raw
 * Nominatim `address` block, covering all known field variants.
 *
 * Output format (only non-empty parts included):
 *   "<house_no> <road/street>, <area/locality>, <city/town/village>,
 *    <district>, <state> - <pincode>"
 *
 * Falls back to `display_name` if fewer than 2 structured parts are found.
 */
function buildFullLabel(a, displayName) {
  if (!a) return displayName || null;

  // ── Street / Road ────────────────────────────────────────────────────────
  const road =
    a.road ||
    a.highway ||
    a.pedestrian ||
    a.footway ||
    a.path ||
    a.cycleway ||
    a.street ||
    a.service ||
    null;
  const houseNo = a["house_number"] || a["addr:housenumber"] || null;
  const streetLine = [houseNo, road].filter(Boolean).join(" ") || null;

  // ── Locality / Area ──────────────────────────────────────────────────────
  const area =
    a.suburb ||
    a.neighbourhood ||
    a.quarter ||
    a.residential ||
    a.hamlet ||
    a.locality ||
    a.isolated_dwelling ||
    null;

  // ── City / Town / Village ────────────────────────────────────────────────
  const city =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.city_district ||
    null;

  // ── District (important for Indian addresses) ────────────────────────────
  const district =
    a.county ||         // Nominatim maps Indian districts → county
    a.district ||
    a.state_district ||
    null;

  // ── State & Pincode ──────────────────────────────────────────────────────
  const state   = a.state   || null;
  const pincode = a.postcode || null;

  // Build ordered parts; skip district if it duplicates city
  const districtPart = district && district !== city ? district : null;
  const parts = [streetLine, area, city, districtPart, state].filter(Boolean);

  if (parts.length < 2) {
    // Structured data too sparse — use Nominatim's own display_name
    return displayName || parts.join(", ") || null;
  }

  const base = parts.join(", ");
  return pincode ? `${base} - ${pincode}` : base;
}

/* ─── Reverse Geocoding ──────────────────────────────────────────────────── */

/**
 * Reverse-geocode real GPS coordinates to a full structured address.
 *
 * Strategy: try zoom=18 (house-level) first. If the result has fewer than
 * 2 meaningful parts (e.g. open field, unmapped road), fall back to zoom=16
 * (neighbourhood level) which tends to give a richer address for Indian towns.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>} Full address string, or null on failure.
 */
export async function reverseGeocode(lat, lng) {
  const base =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}` +
    `&addressdetails=1`;

  const fetchGeocode = async (zoom) => {
    const res = await fetch(`${base}&zoom=${zoom}`, {
      headers: { "Accept-Language": "en" },
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
    });
    if (!res.ok) return null;
    return res.json();
  };

  try {
    // Pass 1 — house-number precision
    let data = await fetchGeocode(18);
    let label = data ? buildFullLabel(data.address, data.display_name) : null;

    // Pass 2 — if label is too sparse, try neighbourhood precision
    if (!label || label.split(",").length < 3) {
      const data2 = await fetchGeocode(16);
      if (data2) {
        const label2 = buildFullLabel(data2.address, data2.display_name);
        // Use the more detailed of the two
        if (label2 && (!label || label2.split(",").length > label.split(",").length)) {
          label = label2;
        }
      }
    }

    return label || null;
  } catch {
    // Network, CORS, timeout — caller shows "Address unavailable"
    return null;
  }
}

/* ─── Forward / Search Geocoding ─────────────────────────────────────────── */

/**
 * Search for real places matching `query` using Nominatim forward geocoding.
 * Returns up to 5 results with full structured addresses.
 * Returns [] on any failure (offline-safe). Never fabricates data.
 *
 * Each result: { lat, lng, label, displayName }
 */
export async function searchLocation(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&q=${encodeURIComponent(query.trim())}` +
      `&limit=5&addressdetails=1&accept-language=en` +
      `&countrycodes=in`;   // prioritise India results

    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item) => {
        const fullLabel =
          buildFullLabel(item.address, item.display_name) ||
          item.display_name ||
          "";
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          label: fullLabel,
          displayName: item.display_name || fullLabel,
        };
      })
      .filter((r) => !isNaN(r.lat) && !isNaN(r.lng));
  } catch {
    return [];
  }
}
