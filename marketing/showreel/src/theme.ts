import { Easing, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import T from "./timing.json";

export const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

export const C = {
  ocean: "#0C6DB5",
  aqua: "#00B2E3",
  navy: "#0A2D5D",
  mist: "#F0F8FF",
  white: "#FFFFFF",
  green: "#22C55E",
  red: "#EF4444",
};

export const FPS = T.fps;
export const f = (s: number) => Math.round(s * FPS);
export const CUT = Object.fromEntries(Object.entries(T.cuts).map(([k, v]) => [k, f(v)])) as Record<keyof typeof T.cuts, number>;
export const EV = T.events;

// Premium easings
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
export const quintInOut = Easing.bezier(0.83, 0, 0.17, 1);
export const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);

export function tw(frame: number, range: [number, number], out: [number, number], easing = expoOut) {
  return interpolate(frame, range, out, { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

export function pop(frame: number, at: number, fps = FPS, stiffness = 180, damping = 13) {
  return spring({ frame: frame - at, fps, config: { stiffness, damping, mass: 0.8 } });
}

export const glass: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
  border: "1.5px solid rgba(255,255,255,0.35)",
  backdropFilter: "blur(22px) saturate(140%)",
  WebkitBackdropFilter: "blur(22px) saturate(140%)",
  boxShadow: "0 30px 80px rgba(4,20,48,0.35), inset 0 1px 0 rgba(255,255,255,0.5)",
};

export const glassLight: React.CSSProperties = {
  background: "rgba(255,255,255,0.82)",
  border: "1.5px solid rgba(255,255,255,0.9)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 24px 60px rgba(10,45,93,0.18), 0 2px 6px rgba(10,45,93,0.06)",
};
