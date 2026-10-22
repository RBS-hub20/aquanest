import "server-only";
import { estimateRoadKm, type LatLng } from "@/lib/geo";

/** Road distance in km — Google Distance Matrix when configured, otherwise haversine × road factor. */
export async function roadDistanceKm(from: LatLng, to: LatLng): Promise<number> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (key) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", `${from.lat},${from.lng}`);
      url.searchParams.set("destinations", `${to.lat},${to.lng}`);
      url.searchParams.set("mode", "driving");
      url.searchParams.set("key", key);
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
      const json = await res.json();
      const meters = json?.rows?.[0]?.elements?.[0]?.distance?.value;
      if (typeof meters === "number") return Math.round((meters / 1000) * 10) / 10;
    } catch {
      // fall through to estimate
    }
  }
  return estimateRoadKm(from, to);
}
