"use client";
import { useEffect, useState } from "react";
import { MapView, type MapMarker } from "@/components/maps/map-view";

/** Shows riders' last known GPS; offline riders sit at the station. Online riders without fresh GPS drift slightly (mock live). */
export function RidersMap({ store, riders }: { store: { lat: number; lng: number }; riders: { id: string; name: string; lat: number | null; lng: number | null; isOnline: boolean }[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 3000);
    return () => clearInterval(t);
  }, []);
  const markers: MapMarker[] = [
    { id: "store", kind: "store", ...store },
    ...riders
      .filter((r) => r.isOnline)
      .map((r, i) => ({
        id: r.id,
        kind: "rider" as const,
        lat: (r.lat ?? store.lat) + Math.sin((tick + i * 7) / 5) * 0.0012,
        lng: (r.lng ?? store.lng) + Math.cos((tick + i * 7) / 5) * 0.0012,
      })),
  ];
  return <MapView center={store} zoom={13} markers={markers} fitToMarkers />;
}
