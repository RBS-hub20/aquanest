export type MarkerKind = "store" | "home" | "rider";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: MarkerKind;
  label?: string;
  draggable?: boolean;
}

export interface MapViewProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: MapMarker[];
  path?: { lat: number; lng: number }[];
  onPick?: (p: { lat: number; lng: number }) => void;
  className?: string;
  fitToMarkers?: boolean;
}

export const MARKER_HTML: Record<MarkerKind, string> = {
  store: `<div style="width:40px;height:40px;border-radius:14px;background:linear-gradient(135deg,#0A2D5D,#0C6DB5);display:grid;place-items:center;box-shadow:0 8px 20px rgba(10,45,93,.35);border:3px solid #fff"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7c3 3.6 6 7 6 10.3a6 6 0 0 1-12 0c0-3.3 3-6.7 6-10.3z"/></svg></div>`,
  home: `<div style="position:relative;width:40px;height:48px"><div style="width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#00B2E3,#0C6DB5);box-shadow:0 8px 20px rgba(12,109,181,.4);border:3px solid #fff"></div><svg style="position:absolute;left:10px;top:9px" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg></div>`,
  rider: `<div style="position:relative;width:46px;height:46px"><span style="position:absolute;inset:-8px;border-radius:999px;background:rgba(0,178,227,.25);animation:anPulse 1.8s ease-out infinite"></span><div style="position:relative;width:46px;height:46px;border-radius:999px;background:#fff;display:grid;place-items:center;box-shadow:0 8px 24px rgba(12,109,181,.45);border:3px solid #00B2E3"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0C6DB5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div></div><style>@keyframes anPulse{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.6);opacity:0}}</style>`,
};
