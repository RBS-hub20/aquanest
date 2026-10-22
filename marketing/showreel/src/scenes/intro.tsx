import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, CUT, EV, f, fontFamily, glass, pop, quintInOut, tw } from "../theme";
import { BrandBackground, Bottle, BrowserFrame, FloatingDrops, PaperIcon, PenIcon, PhoneIcon, Pill, Ripples, SplashBurst, Wordmark, BoltIcon, TruckIcon, BoxesIcon } from "../ui/kit";

/* ───────── Kinetic type ───────── */

export const PopWords: React.FC<{ words: { text: string; at: number; accent?: boolean }[]; size: number; style?: React.CSSProperties; align?: "left" | "center" }> = ({ words, size, style, align = "left" }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: -size * 0.035, color: "#fff", textAlign: align, ...style }}>
      {words.map((w, i) => {
        const s = pop(frame, w.at, 30, 210, 14);
        const blur = interpolate(s, [0, 1], [14, 0], { extrapolateRight: "clamp" });
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - s) * 60}px) scale(${0.7 + 0.3 * s})`,
                opacity: Math.min(1, s * 1.4),
                filter: `blur(${blur}px)`,
                transformOrigin: "50% 80%",
                ...(w.accent
                  ? { background: "linear-gradient(100deg,#FFFFFF 0%,#D8F8FF 45%,#A8ECFF 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: `blur(${blur}px) drop-shadow(0 6px 18px rgba(4,20,48,0.35))` }
                  : {}),
              }}
            >
              {w.text}
            </span>
            {w.text.endsWith("\n") ? <br /> : " "}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const StaggerLetters: React.FC<{ text: string; at: number; size: number; style?: React.CSSProperties; gradient?: string; step?: number }> = ({ text, at, size, style, gradient, step = 1.1 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily, fontWeight: 800, fontSize: size, letterSpacing: -size * 0.035, lineHeight: 1.02, whiteSpace: "pre", ...style }}>
      {text.split("").map((ch, i) => {
        const p = tw(frame, [at + i * step, at + i * step + 14], [0, 1]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * 0.55 * size}px) rotate(${(1 - p) * 8}deg)`,
              filter: `blur(${(1 - p) * 10}px)`,
              ...(gradient ? { background: gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { color: "#fff" }),
            }}
          >
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </div>
  );
};

const L = (sceneStart: number) => (s: number) => f(s) - sceneStart;

/* ───────── 1. HOOK ───────── */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const at = L(CUT.hook);
  const len = CUT.problem - CUT.hook;
  const enter = pop(frame, 2, 30, 120, 14);
  // zoom-through exit into the problem scene
  const exit = tw(frame, [len - 8, len + 6], [0, 1], quintInOut);
  const words = [
    { text: "May", at: at(EV.hookWords[0]) },
    { text: "Water", at: at(EV.hookWords[1]) },
    { text: "Refilling\n", at: at(EV.hookWords[2]) },
    { text: "Station", at: at(EV.hookWords[3]) },
    { text: "ka ba?", at: at(EV.hookWords[4]), accent: true },
  ];
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + exit * 0.6})`, filter: `blur(${exit * 16}px)`, opacity: 1 - exit * 0.6 }}>
      <BrandBackground variant="bright" />
      <FloatingDrops count={16} seed="hook" />
      <div style={{ position: "absolute", left: 120, top: 310, width: 1020 }}>
        <div style={{ opacity: tw(frame, [2, 14], [0, 1]), transform: `translateY(${tw(frame, [2, 14], [20, 0])}px)`, marginBottom: 34 }}>
          <Pill>
            <Img src={staticFile("img/logo-icon.png")} style={{ height: 34 }} /> AquaNest™ · Para sa may-ari ng Water Station
          </Pill>
        </div>
        <PopWords words={words} size={112} style={{ textShadow: "0 8px 30px rgba(4,20,48,0.35)" }} />
        <div style={{ marginTop: 34, width: tw(frame, [at(EV.hookWords[4]) + 4, at(EV.hookWords[4]) + 26], [0, 520]), height: 8, borderRadius: 8, background: "linear-gradient(90deg,#fff,rgba(255,255,255,0))" }} />
      </div>
      {/* bottle hero */}
      <div style={{ position: "absolute", left: 1150, top: 120, width: 600, height: 860 }}>
        <div style={{ position: "absolute", left: -120, top: 80, width: 840, height: 840, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(127,216,245,0.25) 40%, transparent 70%)", opacity: enter }} />
        <SplashBurst at={3} cx={343} cy={770} scale={1.15} seed="hk" count={26} />
        <div style={{ position: "absolute", left: 140, top: 0, transform: `translateY(${(1 - enter) * 500}px) rotate(${(1 - enter) * -12 + Math.sin(frame / 30) * 1.5}deg) scale(${0.8 + 0.2 * enter})`, transformOrigin: "50% 100%" }}>
          <Bottle height={780} />
        </div>
        <Ripples at={3} cx={343} cy={790} rings={3} max={420} />
      </div>
    </AbsoluteFill>
  );
};

/* ───────── 2. PROBLEM ───────── */
export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const at = L(CUT.problem);
  const len = CUT.solution - CUT.problem;
  const zoom = tw(frame, [0, 22], [1.9, 1.04]);
  const blur = tw(frame, [0, 14], [18, 0]);
  const chips = [
    { label: "Papel,", icon: PaperIcon, at: at(EV.problemChips[0]) },
    { label: "ballpen,", icon: PenIcon, at: at(EV.problemChips[1]) },
    { label: "tawag pa rin?", icon: PhoneIcon, at: at(EV.problemChips[2]) },
  ];
  const shake = (i: number) => {
    const t = frame - at(EV.crossOut[i]);
    return t > 0 && t < 10 ? Math.sin(t * 2.2) * (10 - t) * 0.8 : 0;
  };
  const exitFlash = tw(frame, [len - 4, len], [0, 1]);
  return (
    <AbsoluteFill style={{ background: "#061a38" }}>
      {/* landing screenshot, fast zoom */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${zoom})`, filter: `blur(${blur + tw(frame, [14, 30], [0, 7])}px) saturate(${tw(frame, [10, 40], [1, 0.35])})` }}>
        <BrowserFrame src="screens/landing.png" url="aquanest.ph" width={1560} zoom={1 + frame * 0.0015} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, rgba(6,26,56,0.78), rgba(6,26,56,0.95))", opacity: tw(frame, [4, 18], [0, 1]) }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, flexDirection: "column" }}>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: "#9FD8F5", opacity: tw(frame, [at(EV.problemChips[0]) - 6, at(EV.problemChips[0]) + 6], [0, 1]) }}>HANGGANG NGAYON BA…</div>
        <div style={{ display: "flex", gap: 34 }}>
          {chips.map((c, i) => {
            const s = pop(frame, c.at, 30, 220, 13);
            const cross = tw(frame, [at(EV.crossOut[i]), at(EV.crossOut[i]) + 8], [0, 1]);
            const Icon = c.icon;
            return (
              <div key={i} style={{ position: "relative", transform: `translate(${shake(i)}px, ${(1 - s) * 80}px) scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5) }}>
                <div style={{ ...glass, display: "flex", alignItems: "center", gap: 22, padding: "30px 44px", borderRadius: 34, filter: `grayscale(${cross})`, opacity: 1 - cross * 0.35 }}>
                  <div style={{ width: 84, height: 84, borderRadius: 24, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.14)", color: "#fff" }}>
                    <Icon size={46} color="#fff" />
                  </div>
                  <span style={{ fontFamily, fontWeight: 800, fontSize: 74, color: "#fff", letterSpacing: -2 }}>{c.label}</span>
                </div>
                {/* red marker strike */}
                <div style={{ position: "absolute", left: "-3%", top: "56%", width: `${cross * 106}%`, height: 12, marginTop: -6, borderRadius: 8, background: "linear-gradient(90deg,#FF6B6B,#EF4444)", transform: "rotate(-2.5deg)", transformOrigin: "0% 50%", boxShadow: "0 6px 16px rgba(239,68,68,0.55)", opacity: cross > 0 ? 1 : 0 }} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: exitFlash * 0.9 }} />
    </AbsoluteFill>
  );
};

/* ───────── 3. SOLUTION ───────── */
export const Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const at = L(CUT.solution);
  const len = CUT.customer - CUT.solution;
  const card = at(EV.upgradeCard);
  const flash = tw(frame, [0, 10], [1, 0]);
  const headlineOut = tw(frame, [card - 6, card + 10], [0, 1], quintInOut);
  const cardIn = pop(frame, card, 30, 140, 15);
  const tilt = tw(frame, [card, card + 40], [24, 10]);
  const exit = tw(frame, [len - 8, len + 4], [0, 1], quintInOut);
  const chips = [
    { label: "Booking", Icon: BoltIcon, at: at(EV.featureChips[0]) },
    { label: "Delivery Tracking", Icon: TruckIcon, at: at(EV.featureChips[1]) },
    { label: "Inventory", Icon: BoxesIcon, at: at(EV.featureChips[2]) },
  ];
  return (
    <AbsoluteFill style={{ transform: `translateX(${-exit * 380}px)`, filter: `blur(${exit * 12}px)`, opacity: 1 - exit }}>
      <BrandBackground variant="bright" drift={200} />
      <FloatingDrops count={10} seed="sol" opacity={0.6} />

      {/* landing screenshot in 3D behind the glass card */}
      <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `translateY(${tw(frame, [card, card + 30], [760, 330])}px) rotateX(${tilt}deg) scale(${1.02 + (frame - card) * 0.0012})`, opacity: tw(frame, [card, card + 14], [0, 1]) }}>
          <BrowserFrame src="screens/landing.png" url="aquanest.ph" width={1500} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,45,93,0) 45%, rgba(10,45,93,0.75) 100%)" }} />

      {/* headline */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateY(${-headlineOut * 260}px) scale(${1 - headlineOut * 0.35})`, opacity: 1 - headlineOut }}>
        <div style={{ textAlign: "center" }}>
          <StaggerLetters text="Panahon na para" at={2} size={112} style={{ justifyContent: "center", display: "flex" }} step={0.9} />
          <StaggerLetters text="mag-upgrade!" at={12} size={168} step={1.3} gradient="linear-gradient(100deg,#FFFFFF 0%,#BFF3FF 45%,#7FE0FF 100%)" style={{ display: "flex", justifyContent: "center", filter: "drop-shadow(0 10px 30px rgba(4,20,48,0.35))" }} />
        </div>
      </AbsoluteFill>

      {/* glass hero card */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
        <div style={{ ...glass, background: "linear-gradient(135deg, rgba(10,45,93,0.82), rgba(12,109,181,0.72))", borderRadius: 40, padding: "40px 70px 44px", display: "flex", alignItems: "center", gap: 36, transform: `translateY(${(1 - cardIn) * 120}px) scale(${0.85 + 0.15 * cardIn})`, opacity: Math.min(1, cardIn * 1.4) }}>
          <div style={{ width: 150, height: 150, borderRadius: 38, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 20px 50px rgba(4,20,48,0.3)" }}>
            <Img src={staticFile("img/logo-icon.png")} style={{ width: 118 }} />
          </div>
          <div>
            <Wordmark size={96} light />
            <div style={{ fontFamily, fontWeight: 800, fontSize: 52, color: "#fff", marginTop: 10, letterSpacing: -1 }}>
              All-in-One <span style={{ color: "#9FF0FF" }}>System</span>
            </div>
            <div style={{ fontFamily, fontWeight: 600, fontSize: 24, letterSpacing: 4, color: "rgba(255,255,255,0.8)", marginTop: 8 }}>WATER REFILLING STATION & DELIVERY</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 34 }}>
          {chips.map(({ label, Icon, at: a }) => {
            const s = pop(frame, a, 30, 240, 12);
            return (
              <div key={label} style={{ transform: `scale(${s})`, opacity: Math.min(1, s * 2) }}>
                <Pill style={{ fontSize: 30, padding: "16px 30px", background: "rgba(255,255,255,0.92)", color: C.navy, border: "none" }}>
                  <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#00B2E3,#0C6DB5)" }}>
                    <Icon size={26} color="#fff" />
                  </span>
                  {label}
                </Pill>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash * 0.85 }} />
    </AbsoluteFill>
  );
};
