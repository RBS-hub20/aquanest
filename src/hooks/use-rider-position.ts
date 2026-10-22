"use client";
import { useEffect, useState } from "react";
import { lerp, RIDER_SPEED_KMH, type LatLng } from "@/lib/geo";

interface Input {
  status: string;
  outForDeliveryAt: string | null;
  distanceKm: number;
  dest: LatLng | null;
  store: LatLng;
  rider?: { lat: number | null; lng: number | null; lastSeenAt: string | null } | null;
}

/**
 * Rider position for the live map: real GPS when the rider app shared a fresh location,
 * otherwise a smooth simulation along the route based on time since dispatch.
 */
export function useRiderPosition(i: Input) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (i.status !== "OUT_FOR_DELIVERY") return;
    const t = setInterval(() => setNow(Date.now()), 2500);
    return () => clearInterval(t);
  }, [i.status]);

  if (!i.dest) return { pos: null, etaMin: null, progress: 0, live: false };
  if (i.status === "DELIVERED") return { pos: i.dest, etaMin: 0, progress: 1, live: false };
  if (i.status !== "OUT_FOR_DELIVERY") return { pos: null, etaMin: null, progress: 0, live: false };

  const fresh = i.rider?.lastSeenAt && now - new Date(i.rider.lastSeenAt).getTime() < 3 * 60_000 && i.rider.lat != null && i.rider.lng != null;
  const totalMin = Math.max(6, (Math.max(i.distanceKm, 0.5) / RIDER_SPEED_KMH) * 60);
  const elapsedMin = i.outForDeliveryAt ? (now - new Date(i.outForDeliveryAt).getTime()) / 60_000 : 0;
  const progress = Math.min(0.97, Math.max(0.03, elapsedMin / totalMin));
  const pos = fresh ? { lat: i.rider!.lat!, lng: i.rider!.lng! } : lerp(i.store, i.dest, progress);
  const etaMin = Math.max(1, Math.round(totalMin * (1 - progress)));
  return { pos, etaMin, progress, live: Boolean(fresh) };
}
