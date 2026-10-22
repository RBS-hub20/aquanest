"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { MARKER_HTML, type MapViewProps } from "./types";

const icon = (kind: keyof typeof MARKER_HTML) =>
  L.divIcon({ html: MARKER_HTML[kind], className: "", iconSize: kind === "rider" ? [46, 46] : [40, 44], iconAnchor: kind === "home" ? [20, 46] : [20, 20] });

function ClickHandler({ onPick }: { onPick?: MapViewProps["onPick"] }) {
  useMapEvents({ click: (e) => onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Fit({ markers, fit, center }: { markers: MapViewProps["markers"]; fit?: boolean; center: MapViewProps["center"] }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);
  useEffect(() => {
    if (fit && markers.length > 1) map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), { padding: [48, 48], maxZoom: 16 });
    else map.setView([center.lat, center.lng], map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, markers.length, center.lat, center.lng]);
  return null;
}

export default function LeafletMap({ center, zoom = 15, markers, path, onPick, className, fitToMarkers }: MapViewProps) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom={false} className={className} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <ClickHandler onPick={onPick} />
      <Fit markers={markers} fit={fitToMarkers} center={center} />
      {path && path.length > 1 && <Polyline positions={path.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#0C6DB5", weight: 5, opacity: 0.75, dashArray: "1 10", lineCap: "round" }} />}
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={icon(m.kind)}
          draggable={m.draggable}
          eventHandlers={m.draggable ? { dragend: (e) => onPick?.((e.target as L.Marker).getLatLng()) } : undefined}
        />
      ))}
    </MapContainer>
  );
}
