/**
 * Real reverse geocoding using OpenStreetMap's Nominatim service — free, no
 * API key required. Appropriate for a prototype/student-project volume of
 * requests; Nominatim's usage policy asks production services to self-host
 * or use a paid provider at scale (see README).
 *
 * Never fabricates an address. On any failure this returns `null`, and the
 * caller is responsible for showing "Address unavailable" rather than
 * inventing something.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}` +
      `&zoom=14&addressdetails=1`;

    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;

    const data = await res.json();
    const a = data?.address;
    if (!a) return data?.display_name ?? null;

    const locality = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city || a.county;
    const region = a.state;
    const label = [locality, region].filter(Boolean).join(", ");

    return label || data.display_name || null;
  } catch {
    // Network failure, CORS issue, rate limiting, malformed response — any
    // of these fall through to "Address unavailable" in the UI, never a guess.
    return null;
  }
}
