"use client";
import dynamic from "next/dynamic";
import { GOOGLE_MAPS_KEY } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { MapViewProps } from "./types";

const Loading = () => <div className="h-full w-full animate-pulse rounded-2xl bg-gradient-to-br from-mist to-ocean-50" />;
const GoogleMapView = dynamic(() => import("./google-map"), { ssr: false, loading: Loading });
const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false, loading: Loading });

/** Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set, OpenStreetMap otherwise. */
export function MapView(props: MapViewProps) {
  return (
    <div className={cn("relative isolate h-full w-full overflow-hidden rounded-2xl", props.className)}>
      {GOOGLE_MAPS_KEY ? <GoogleMapView {...props} className="h-full w-full" /> : <LeafletMap {...props} className="h-full w-full" />}
    </div>
  );
}
export type { MapMarker, MapViewProps } from "./types";
