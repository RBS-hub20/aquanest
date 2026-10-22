import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, fontFamily, glass, tw } from "../theme";

/* ───────── Backgrounds ───────── */

export const BrandBackground: React.FC<{ variant?: "deep" | "bright" | "light"; drift?: number }> = ({ variant = "deep", drift = 0 }) => {
  const frame = useCurrentFrame();
  const t = (frame + drift) / 30;
  const x = 62 + Math.sin(t * 0.35) * 8;
  const y = 30 + Math.cos(t * 0.27) * 6;
  const bg =
    variant === "light"
      ? `radial-gradient(1400px 900px at ${x}% ${y}%, #FFFFFF 0%, #EAF6FE 45%, #D6ECFA 100%)`
      : variant === "bright"
        ? `radial-gradient(1500px 1000px at ${x}% ${y}%, #3FD0F5 0%, #00B2E3 22%, #0C6DB5 58%, #0A2D5D 100%)`
        : `radial-gradient(1400px 950px at ${x}% ${y}%, #1aa7e6 0%, #0C6DB5 38%, #0A2D5D 78%, #061a38 100%)`;
  return (
    <AbsoluteFill style={{ background: bg }}>
      {variant !== "light" && <Rays opacity={variant === "bright" ? 0.22 : 0.14} />}
      <Bokeh light={variant === "light"} />
      <Grain />
    </AbsoluteFill>
  );
};

export const Rays: React.FC<{ opacity?: number }> = ({ opacity = 0.15 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity, mixBlendMode: "screen" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "-40%",
          width: 2600,
          height: 2600,
          marginLeft: -1300,
          transform: `rotate(${frame * 0.08}deg)`,
          background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.9) 0deg 4deg, transparent 4deg 18deg)",
          maskImage: "radial-gradient(closest-side, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(closest-side, black 0%, transparent 75%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Bokeh: React.FC<{ light?: boolean; count?: number }> = ({ light, count = 14 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => {
        const size = 80 + random(`b${i}`) * 260;
        const x = random(`bx${i}`) * 1920;
        const y = random(`by${i}`) * 1080 + Math.sin((frame + i * 40) / 60) * 30;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: light ? "radial-gradient(circle, rgba(0,178,227,0.12), transparent 70%)" : "radial-gradient(circle, rgba(127,216,245,0.18), transparent 70%)",
              filter: "blur(6px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
  );

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url("${GRAIN}")`, opacity: 0.05, backgroundPosition: `${(frame * 37) % 240}px ${(frame * 53) % 240}px`, mixBlendMode: "overlay" }} />;
};

/* ───────── Water ───────── */

export const Drop: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 40 52" style={style}>
    <defs>
      <radialGradient id="dg" cx="0.35" cy="0.4" r="0.75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#B9E9FA" />
        <stop offset="1" stopColor="#00B2E3" />
      </radialGradient>
    </defs>
    <path d="M20 2C28 14 38 25 38 34a18 18 0 0 1-36 0C2 25 12 14 20 2z" fill="url(#dg)" fillOpacity="0.92" />
    <ellipse cx="13" cy="32" rx="3" ry="6" fill="#fff" fillOpacity="0.85" transform="rotate(-20 13 32)" />
  </svg>
);

/** Floating ambient droplets */
export const FloatingDrops: React.FC<{ count?: number; seed?: string; opacity?: number }> = ({ count = 12, seed = "fd", opacity = 0.8 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const s = 14 + random(`${seed}s${i}`) * 26;
        const x = random(`${seed}x${i}`) * 1920;
        const y = random(`${seed}y${i}`) * 1080 + Math.sin((frame + i * 23) / 28) * 14;
        return <Drop key={i} size={s} style={{ position: "absolute", left: x, top: y, opacity: opacity * (0.5 + random(`${seed}o${i}`) * 0.5), transform: `rotate(${Math.sin((frame + i * 9) / 40) * 8}deg)` }} />;
      })}
    </AbsoluteFill>
  );
};

/** Falling rain of droplets with streaks */
export const FallingDrops: React.FC<{ count?: number; seed?: string; speed?: number }> = ({ count = 26, seed = "rain", speed = 14 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => {
        const s = 12 + random(`${seed}s${i}`) * 30;
        const x = random(`${seed}x${i}`) * 1920;
        const v = speed * (0.6 + random(`${seed}v${i}`) * 0.8);
        const y = ((random(`${seed}y${i}`) * 1400 + frame * v) % 1400) - 200;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y }}>
            <div style={{ position: "absolute", left: s / 2 - 1, top: -s * 2.2, width: 2, height: s * 2.2, background: "linear-gradient(transparent, rgba(255,255,255,0.45))", borderRadius: 2 }} />
            <Drop size={s} style={{ opacity: 0.85 }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Burst splash: droplets fly out radially with gravity, crown wave rises. */
export const SplashBurst: React.FC<{ at: number; cx: number; cy: number; scale?: number; count?: number; seed?: string }> = ({ at, cx, cy, scale = 1, count = 22, seed = "sp" }) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / 30;
  if (t < 0) return null;
  const crown = tw(frame, [at, at + 18], [0, 1]);
  const crownFade = tw(frame, [at + 30, at + 70], [1, 0.75]);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none" }}>
      {/* crown */}
      <svg viewBox="0 0 600 220" style={{ position: "absolute", left: cx - 330 * scale, top: cy - 120 * scale, width: 660 * scale, height: 240 * scale, opacity: crownFade, transform: `scaleY(${crown})`, transformOrigin: "50% 100%" }}>
        <defs>
          <linearGradient id="cw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#B9EEFF" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#00B2E3" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0C6DB5" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path d="M20 200c30-6 46-70 74-70s30 46 56 50c22-36 30-110 52-110s20 76 40 90c20-16 24-66 42-66s22 52 42 66c20-14 18-90 40-90s30 74 52 110c26-4 32-50 56-50s44 64 74 70c0 14-120 20-280 20S20 214 20 200z" fill="url(#cw)" />
        <path d="M60 196c50-10 90-30 140-20s80 26 120 26 80-22 120-28 60 12 100 22" stroke="#fff" strokeOpacity="0.6" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
      {Array.from({ length: count }).map((_, i) => {
        const ang = (-Math.PI / 2) + (random(`${seed}a${i}`) - 0.5) * Math.PI * 1.25;
        const v = (420 + random(`${seed}v${i}`) * 680) * scale;
        const x = cx + Math.cos(ang) * v * t;
        const y = cy + Math.sin(ang) * v * t + 0.5 * 1500 * scale * t * t;
        const s = (10 + random(`${seed}s${i}`) * 26) * scale;
        const op = interpolate(t, [0, 0.05, 0.9, 1.3], [0, 1, 0.9, 0], { extrapolateRight: "clamp" });
        return <Drop key={i} size={s} style={{ position: "absolute", left: x - s / 2, top: y - s / 2, opacity: op, transform: `rotate(${(ang + Math.PI / 2) * 57}deg)` }} />;
      })}
    </div>
  );
};

/** Expanding water ripples */
export const Ripples: React.FC<{ at: number; cx: number; cy: number; color?: string; rings?: number; max?: number }> = ({ at, cx, cy, color = "rgba(255,255,255,0.7)", rings = 3, max = 900 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: rings }).map((_, i) => {
        const start = at + i * 7;
        const p = tw(frame, [start, start + 55], [0, 1]);
        if (frame < start) return null;
        const r = p * max;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx - r,
              top: cy - r * 0.32,
              width: r * 2,
              height: r * 0.64,
              borderRadius: "50%",
              border: `${3 - i * 0.6}px solid ${color}`,
              opacity: 1 - p,
            }}
          />
        );
      })}
    </>
  );
};

/* ───────── Product shot ───────── */

export const Bottle: React.FC<{ src?: string; height: number; float?: boolean; style?: React.CSSProperties; shadow?: boolean }> = ({ src = "img/aquanest-19l-round.webp", height, float = true, style, shadow = true }) => {
  const frame = useCurrentFrame();
  const y = float ? Math.sin(frame / 24) * 12 : 0;
  const k = float ? 1 - (Math.sin(frame / 24) + 1) * 0.06 : 1;
  return (
    <div style={{ position: "relative", height, ...style }}>
      {shadow && <div style={{ position: "absolute", left: "15%", right: "15%", bottom: -height * 0.02, height: height * 0.06, borderRadius: "50%", background: "rgba(4,20,48,0.45)", filter: "blur(14px)", transform: `scaleX(${k})` }} />}
      <Img src={staticFile(src)} style={{ height, transform: `translateY(${y}px)`, filter: "drop-shadow(0 30px 40px rgba(4,20,48,0.35))", display: "block" }} />
    </div>
  );
};

/* ───────── Device frames ───────── */

export const BrowserFrame: React.FC<{ src: string; url: string; width: number; children?: React.ReactNode; zoom?: number; originX?: string; originY?: string; panX?: number; panY?: number; style?: React.CSSProperties; dark?: boolean }> = ({
  src,
  url,
  width,
  children,
  zoom = 1,
  originX = "50%",
  originY = "50%",
  panX = 0,
  panY = 0,
  style,
}) => {
  const h = (width * 900) / 1440;
  return (
    <div style={{ width, borderRadius: 22, overflow: "hidden", background: "#fff", boxShadow: "0 60px 120px rgba(4,20,48,0.5), 0 10px 30px rgba(4,20,48,0.25), 0 0 0 1px rgba(255,255,255,0.4)", ...style }}>
      <div style={{ height: 46, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", background: "linear-gradient(#F7FAFD,#EEF4FA)", borderBottom: "1px solid #E3ECF5" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <span key={c} style={{ width: 13, height: 13, borderRadius: 99, background: c }} />
        ))}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 28, padding: "0 18px", minWidth: 340, justifyContent: "center", borderRadius: 9, background: "#fff", border: "1px solid #E3ECF5", fontFamily, fontSize: 14, fontWeight: 600, color: "#5B7194" }}>
            <LockIcon /> {url}
          </div>
        </div>
        <span style={{ width: 60 }} />
      </div>
      <div style={{ position: "relative", height: h, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width, height: h, objectFit: "cover", objectPosition: "top", transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: `${originX} ${originY}` }} />
        {children}
      </div>
    </div>
  );
};

export const PhoneFrame: React.FC<{ src: string; height: number; style?: React.CSSProperties; scrollY?: number }> = ({ src, height, style, scrollY = 0 }) => {
  const w = height * 0.486;
  return (
    <div style={{ width: w, height, borderRadius: height * 0.075, padding: height * 0.016, background: "linear-gradient(145deg,#1d2b44,#0a1222)", boxShadow: "0 60px 120px rgba(4,20,48,0.55), inset 0 0 0 2px rgba(255,255,255,0.12)", ...style }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: height * 0.062, overflow: "hidden", background: "#fff" }}>
        <Img src={staticFile(src)} style={{ width: "100%", transform: `translateY(${-scrollY}px)` }} />
        <div style={{ position: "absolute", top: height * 0.012, left: "50%", width: w * 0.3, height: height * 0.032, marginLeft: -w * 0.15, borderRadius: 99, background: "#000" }} />
      </div>
    </div>
  );
};

/* ───────── Type & chrome ───────── */

export const Pill: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ ...glass, display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 24px", borderRadius: 999, fontFamily, fontWeight: 700, fontSize: 24, color: "#fff", letterSpacing: 0.5, ...style }}>{children}</div>
);

export const Wordmark: React.FC<{ size: number; light?: boolean }> = ({ size, light }) => (
  <span style={{ fontFamily, fontWeight: 800, fontSize: size, letterSpacing: -size * 0.02, lineHeight: 1 }}>
    <span style={{ color: light ? "#fff" : C.navy }}>Aqua</span>
    <span style={{ color: light ? "#9FE6FA" : C.ocean }}>Nest</span>
    <sup style={{ fontSize: size * 0.3, color: light ? "#fff" : C.navy, marginLeft: 2 }}>™</sup>
  </span>
);

/* ───────── Icons (lucide-style paths) ───────── */

const Ic: React.FC<{ d: React.ReactNode; size?: number; color?: string; stroke?: number }> = ({ d, size = 28, color = "currentColor", stroke = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
export const LockIcon = () => <Ic size={13} stroke={2.6} d={<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>} />;
export const PaperIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>} />;
export const PenIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>} />;
export const PhoneIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />} />;
export const CheckIcon = (p: { size?: number; color?: string; progress?: number }) => (
  <svg width={p.size ?? 28} height={p.size ?? 28} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} strokeDashoffset={24 * (1 - (p.progress ?? 1))} />
  </svg>
);
export const TruckIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.7a1 1 0 0 0-.2-.6l-3.5-4.3A1 1 0 0 0 17.5 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>} />;
export const WalletIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>} />;
export const BoxesIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></>} />;
export const GiftIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>} />;
export const ReceiptIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" /><path d="M8 7h8M8 11h8M8 15h5" /></>} />;
export const NavIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<path d="m3 11 19-9-9 19-2-8z" />} />;
export const GlobeIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" /></>} />;
export const MsgIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />} />;
export const BoltIcon = (p: { size?: number; color?: string }) => <Ic {...p} d={<path d="M13 2 3 14h9l-1 8 10-12h-9z" />} />;

/** Hook for scene-local entry/exit (fade+scale+blur) */
export function useSceneFade(len: number, inF = 10, outF = 10) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const end = Math.min(len, durationInFrames);
  const o = Math.min(tw(frame, [0, inF], [0, 1]), tw(frame, [end - outF, end], [1, 0]));
  return o;
}
