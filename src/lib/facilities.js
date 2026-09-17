/**
 * Real nearby-facility lookup using the OpenStreetMap Overpass API — free,
 * no API key. Queries actual mapped hospitals, police stations, fire
 * stations and shelters around a real coordinate. There is no fake/seed
 * facility list anywhere in this file.
 *
 * Overpass is community infrastructure with modest rate limits; fine for a
 * prototype/student project, not for production traffic (see README for
 * scaling notes).
 */
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

const TAG_TO_TYPE = {
  hospital: "hospital",
  police: "police",
  fire_station: "fire",
};

function typeFor(tags) {
  if (!tags) return "shelter";
  if (TAG_TO_TYPE[tags.amenity]) return TAG_TO_TYPE[tags.amenity];
  if (tags.emergency === "shelter" || tags.amenity === "shelter") return "shelter";
  return "shelter";
}

function nameFor(tags, type) {
  if (tags?.name) return tags.name;
  return { hospital: "Hospital", police: "Police station", fire: "Fire station", shelter: "Emergency shelter" }[type];
}

function addressFor(tags) {
  if (!tags) return null;
  const parts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"] || tags["addr:city"]].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

/** Great-circle distance in km between two real coordinate pairs. */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetches real hospitals / police stations / fire stations / shelters within
 * `radiusMeters` of a real coordinate. Throws on failure — callers decide how
 * to surface that; this never substitutes fabricated facilities.
 */
export async function fetchNearbyFacilities(lat, lng, radiusMeters = 6000) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["amenity"="police"](around:${radiusMeters},${lat},${lng});
      way["amenity"="police"](around:${radiusMeters},${lat},${lng});
      node["amenity"="fire_station"](around:${radiusMeters},${lat},${lng});
      way["amenity"="fire_station"](around:${radiusMeters},${lat},${lng});
      node["emergency"="shelter"](around:${radiusMeters},${lat},${lng});
      node["amenity"="shelter"](around:${radiusMeters},${lat},${lng});
    );
    out center 80;
  `.trim();

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query,
  });

  if (!res.ok) {
    throw new Error(`Overpass request failed (${res.status})`);
  }

  const data = await res.json();
  const elements = Array.isArray(data?.elements) ? data.elements : [];

  return elements
    .map((el) => {
      const flat = el.lat ?? el.center?.lat;
      const flng = el.lon ?? el.center?.lon;
      if (typeof flat !== "number" || typeof flng !== "number") return null;

      const type = typeFor(el.tags);
      return {
        id: `${el.type}/${el.id}`,
        type,
        name: nameFor(el.tags, type),
        address: addressFor(el.tags),
        phone: el.tags?.phone || el.tags?.["contact:phone"] || null,
        lat: flat,
        lng: flng,
        distanceKm: haversineDistanceKm(lat, lng, flat, flng),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
