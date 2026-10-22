export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Approximate road distance when the Distance Matrix API isn't configured. */
export const ROAD_FACTOR = 1.3;

export function estimateRoadKm(a: LatLng, b: LatLng) {
  return Math.round(haversineKm(a, b) * ROAD_FACTOR * 10) / 10;
}

/** Linear interpolation used for the simulated rider position. */
export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  const k = Math.min(1, Math.max(0, t));
  // small sideways wobble so the path looks like streets rather than a ruler line
  const wobble = Math.sin(k * Math.PI * 3) * 0.0009;
  return { lat: a.lat + (b.lat - a.lat) * k + wobble, lng: a.lng + (b.lng - a.lng) * k - wobble };
}

export const RIDER_SPEED_KMH = 22;

export function googleMapsDirectionsUrl(dest: LatLng, origin?: LatLng) {
  const d = `${dest.lat},${dest.lng}`;
  const o = origin ? `&origin=${origin.lat},${origin.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${d}${o}&travelmode=driving`;
}
