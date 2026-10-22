"use client";
import { useEffect } from "react";
import { APIProvider, AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_KEY } from "@/lib/env";
import { MARKER_HTML, type MapViewProps } from "./types";

function PathAndFit({ path, markers, fit }: { path?: MapViewProps["path"]; markers: MapViewProps["markers"]; fit?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    let line: google.maps.Polyline | null = null;
    if (path && path.length > 1) {
      line = new google.maps.Polyline({
        path,
        map,
        strokeOpacity: 0,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.8, strokeColor: "#0C6DB5", scale: 4 }, offset: "0", repeat: "14px" }],
      });
    }
    if (fit && markers.length > 1) {
      const b = new google.maps.LatLngBounds();
      markers.forEach((m) => b.extend(m));
      map.fitBounds(b, 60);
    }
    return () => line?.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(path), fit, markers.length]);
  return null;
}

export default function GoogleMapView({ center, zoom = 15, markers, path, onPick, className, fitToMarkers }: MapViewProps) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_KEY}>
      <Map
        className={className}
        style={{ width: "100%", height: "100%" }}
        defaultCenter={center}
        defaultZoom={zoom}
        mapId="aquanest-map"
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        onClick={(e) => e.detail.latLng && onPick?.(e.detail.latLng)}
      >
        {markers.map((m) => (
          <AdvancedMarker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            draggable={m.draggable}
            onDragEnd={(e) => e.latLng && onPick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
          >
            <div dangerouslySetInnerHTML={{ __html: MARKER_HTML[m.kind] }} />
          </AdvancedMarker>
        ))}
        <PathAndFit path={path} markers={markers} fit={fitToMarkers} />
      </Map>
    </APIProvider>
  );
}
