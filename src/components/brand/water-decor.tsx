"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** A single glossy droplet */
export function Droplet({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 52" className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id="dg" cx="0.35" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#B9E9FA" />
          <stop offset="1" stopColor="#00B2E3" />
        </radialGradient>
      </defs>
      <path d="M20 2C28 14 38 25 38 34a18 18 0 0 1-36 0C2 25 12 14 20 2z" fill="url(#dg)" fillOpacity="0.85" />
      <ellipse cx="13" cy="32" rx="3" ry="6" fill="#fff" fillOpacity="0.8" transform="rotate(-20 13 32)" />
    </svg>
  );
}

/** Floating droplets + soft splash blobs for page backgrounds */
export function WaterBackdrop({ className, density = 7 }: { className?: string; density?: number }) {
  const drops = Array.from({ length: density }, (_, i) => ({
    left: `${(i * 137) % 100}%`,
    top: `${(i * 61) % 90}%`,
    size: 10 + ((i * 7) % 18),
    delay: i * 0.7,
    dur: 6 + (i % 4),
  }));
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-aqua/20 via-sky-200/20 to-transparent blur-3xl" />
      <div className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-ocean/10 via-aqua/10 to-transparent blur-3xl" />
      {drops.map((d, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: d.left, top: d.top, width: d.size, height: d.size * 1.3 }}
          animate={{ y: [0, -14, 0], opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: "easeInOut" }}
        >
          <Droplet className="h-full w-full" />
        </motion.div>
      ))}
    </div>
  );
}

/** Animated waves band */
export function Waves({ className, color = "#0C6DB5", opacity = 0.12 }: { className?: string; color?: string; opacity?: number }) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden", className)} aria-hidden>
      <div className="absolute bottom-0 flex w-[200%] animate-wave">
        {[0, 1].map((k) => (
          <svg key={k} viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-24 w-1/2">
            <path d="M0 64c120-32 240-32 360 0s240 32 360 0 240-32 360 0 240 32 360 0v56H0z" fill={color} fillOpacity={opacity} />
            <path d="M0 84c120-24 240-24 360 0s240 24 360 0 240-24 360 0 240 24 360 0v36H0z" fill={color} fillOpacity={opacity * 1.6} />
          </svg>
        ))}
      </div>
    </div>
  );
}

/** Decorative splash ring (CSS ripple) */
export function Ripple({ className }: { className?: string }) {
  return (
    <span className={cn("pointer-events-none absolute inline-flex", className)} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ripple rounded-full border-2 border-aqua/40" />
      <span className="absolute inline-flex h-full w-full animate-ripple rounded-full border-2 border-aqua/30 [animation-delay:1.2s]" />
    </span>
  );
}

/** Mint leaves accent */
export function Leaves({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 60" className={className} aria-hidden>
      <defs>
        <linearGradient id="lf" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#8EE07A" />
          <stop offset="1" stopColor="#2E9E45" />
        </linearGradient>
      </defs>
      <path d="M8 50C10 24 30 8 56 6 52 30 34 48 8 50z" fill="url(#lf)" />
      <path d="M8 50C22 36 36 24 54 9" stroke="#1E7A33" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M40 54c4-16 18-26 36-26-4 16-18 26-36 26z" fill="url(#lf)" opacity="0.85" />
    </svg>
  );
}

/** Crown water splash that sits behind the hero bottle. */
export function WaterSplash({ className }: { className?: string }) {
  const drops = [
    { x: 78, y: 210, s: 1.1, d: 0 },
    { x: 520, y: 170, s: 1.3, d: 0.6 },
    { x: 548, y: 320, s: 0.8, d: 1.2 },
    { x: 46, y: 360, s: 0.7, d: 0.9 },
    { x: 130, y: 120, s: 0.6, d: 1.6 },
    { x: 470, y: 90, s: 0.55, d: 0.3 },
    { x: 560, y: 450, s: 0.6, d: 2 },
    { x: 30, y: 470, s: 0.9, d: 1.4 },
  ];
  return (
    <svg viewBox="0 0 600 600" className={cn("pointer-events-none", className)} aria-hidden>
      <defs>
        <radialGradient id="ws-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#E6F8FD" />
          <stop offset="55%" stopColor="#B9E9FA" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#B9E9FA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ws-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7FD8F5" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#00B2E3" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0C6DB5" />
        </linearGradient>
        <linearGradient id="ws-swoosh" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0C6DB5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7FD8F5" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="ws-fade-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
        </linearGradient>
        <mask id="ws-fade">
          <rect x="0" y="380" width="600" height="220" fill="url(#ws-fade-g)" />
        </mask>
        <radialGradient id="ws-drop" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#B9E9FA" />
          <stop offset="100%" stopColor="#00B2E3" />
        </radialGradient>
      </defs>

      <circle cx="300" cy="330" r="270" fill="url(#ws-glow)" />

      {/* side swooshes */}
      <motion.g initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: "easeOut" }} style={{ transformOrigin: "300px 520px" }}>
        <path d="M70 540C40 450 60 330 150 250c-20 70-18 150 20 230 10 20 30 40 50 60z" fill="url(#ws-swoosh)" />
        <path d="M95 520c-14-70 0-150 55-215" stroke="#fff" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M530 540c30-90 10-210-80-290 20 70 18 150-20 230-10 20-30 40-50 60z" fill="url(#ws-swoosh)" />
        <path d="M505 520c14-70 0-150-55-215" stroke="#fff" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M110 300c-30-40-36-90-10-140 6 46 22 86 52 120z" fill="#7FD8F5" fillOpacity="0.6" />
        <path d="M490 300c30-40 36-90 10-140-6 46-22 86-52 120z" fill="#7FD8F5" fillOpacity="0.6" />
      </motion.g>

      {/* crown splash at the base */}
      <motion.path
        d="M40 540c30-6 46-60 70-60s30 40 56 44c22-30 30-92 52-92s20 64 40 76c20-14 24-56 42-56s22 44 42 56c20-12 18-76 40-76s30 62 52 92c26-4 32-44 56-44s40 54 70 60c0 34-116 52-260 52S40 574 40 540z"
        fill="url(#ws-water)"
        mask="url(#ws-fade)"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
      />
      <path d="M80 556c40-10 70-36 110-28s60 36 110 36 80-28 110-36 70 18 110 28" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* droplets */}
      {drops.map((d, i) => (
        <motion.g key={i} animate={{ y: [0, -10, 0] }} transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: d.d, ease: "easeInOut" }}>
          <g transform={`translate(${d.x} ${d.y}) scale(${d.s})`}>
            <path d="M0-22C8-10 16-2 16 8a16 16 0 0 1-32 0C-16-2-8-10 0-22z" fill="url(#ws-drop)" />
            <ellipse cx="-6" cy="6" rx="3" ry="6" fill="#fff" fillOpacity="0.85" transform="rotate(-20 -6 6)" />
          </g>
        </motion.g>
      ))}
      {[[150, 470, 5], [450, 470, 6], [200, 420, 4], [400, 430, 4], [260, 470, 3], [340, 460, 3]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#fff" fillOpacity="0.85" />
      ))}
    </svg>
  );
}
