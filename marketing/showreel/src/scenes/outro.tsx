import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, CUT, EV, f, fontFamily, glass, glassLight, pop, quintInOut, tw } from "../theme";
import { BoxesIcon, BrandBackground, CheckIcon, FallingDrops, GiftIcon, GlobeIcon, MsgIcon, PhoneIcon, ReceiptIcon, Ripples, SplashBurst, TruckIcon, WalletIcon, Drop } from "../ui/kit";

const L = (sceneStart: number) => (s: number) => f(s) - sceneStart;

/* ───────── 5. BENEFITS ───────── */
const BENEFITS = [
  { title: "Auto Booking & Delivery Tracking", tag: "like Grab", Icon: TruckIcon, img: "img/aquanest-19l-round.webp" },
  { title: "GCash / Maya / COD", tag: "auto", Icon: WalletIcon, img: "img/aquanest-slim.webp" },
  { title: "Gallon Inventory + Utang Tracker", tag: "", Icon: BoxesIcon, img: "img/aquanest-10l.webp" },
  { title: "Suki Loyalty", tag: "10th refill FREE", Icon: GiftIcon, img: "img/aquanest-6l.webp" },
  { title: "POS for Walk-in + Reports", tag: "Excel", Icon: ReceiptIcon, img: "img/aquanest-case-500ml.webp" },
];

export const Benefits: React.FC = () => {
  const frame = useCurrentFrame();
  const at = L(CUT.benefits);
  const len = CUT.cta - CUT.benefits;
  const inP = tw(frame, [0, 12], [0, 1], quintInOut);
  const exit = tw(frame, [len - 10, len], [0, 1], quintInOut);
  return (
    <AbsoluteFill style={{ opacity: 1 - exit * 0.2, transform: `scale(${1 - exit * 0.06})`, filter: `blur(${exit * 10}px)` }}>
      <AbsoluteFill style={{ clipPath: `circle(${inP * 140}% at 50% 50%)` }}>
        <BrandBackground variant="light" />
        {/* heading */}
        <div style={{ position: "absolute", left: 110, top: 86, fontFamily, opacity: tw(frame, [2, 14], [0, 1]), transform: `translateY(${tw(frame, [2, 14], [24, 0])}px)` }}>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 5, color: C.ocean }}>LAHAT NG KAILANGAN MO</div>
          <div style={{ fontWeight: 800, fontSize: 64, letterSpacing: -2, color: C.navy, marginTop: 6 }}>
            Isang app. <span style={{ color: C.ocean }}>Buong negosyo.</span>
          </div>
        </div>
        {/* list */}
        <div style={{ position: "absolute", left: 110, top: 270, display: "flex", flexDirection: "column", gap: 20 }}>
          {BENEFITS.map((b, i) => {
            const a = at(EV.benefitPops[i]);
            const s = pop(frame, a, 30, 230, 13);
            const check = tw(frame, [a + 3, a + 12], [0, 1]);
            return (
              <div key={b.title} style={{ ...glassLight, display: "flex", alignItems: "center", gap: 24, padding: "18px 30px 18px 18px", borderRadius: 28, width: 960, transform: `translateX(${(1 - s) * -140}px) scale(${0.85 + 0.15 * s})`, opacity: Math.min(1, s * 1.5), transformOrigin: "0% 50%" }}>
                <span style={{ width: 70, height: 70, borderRadius: 22, background: "linear-gradient(135deg,#00B2E3,#0C6DB5)", display: "grid", placeItems: "center", boxShadow: "0 12px 26px rgba(12,109,181,0.35)", flexShrink: 0 }}>
                  <b.Icon size={36} color="#fff" />
                </span>
                <span style={{ fontFamily, fontWeight: 800, fontSize: 38, color: C.navy, letterSpacing: -1, flex: 1 }}>
                  {b.title}
                  {b.tag && <span style={{ marginLeft: 14, fontSize: 24, fontWeight: 800, color: C.ocean, background: "#E3F2FC", padding: "6px 14px", borderRadius: 999, verticalAlign: "middle" }}>{b.tag}</span>}
                </span>
                <span style={{ width: 52, height: 52, borderRadius: 999, background: "#22C55E", display: "grid", placeItems: "center", transform: `scale(${pop(frame, a + 3, 30, 300, 12)})`, flexShrink: 0 }}>
                  <CheckIcon size={30} color="#fff" progress={check} />
                </span>
              </div>
            );
          })}
        </div>
        {/* product lineup on a glossy floor */}
        <div style={{ position: "absolute", left: 1070, top: 250, width: 760, height: 700 }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, height: 140, borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(12,109,181,0.18), transparent 70%)" }} />
          {BENEFITS.map((b, i) => {
            const a = at(EV.benefitPops[i]);
            const s = pop(frame, a + 2, 30, 160, 12);
            const slots = [
              { x: 230, h: 520, z: 5 },
              { x: 30, h: 360, z: 3 },
              { x: 470, h: 340, z: 3 },
              { x: 610, h: 260, z: 2 },
              { x: 90, h: 230, z: 4, y: 40 },
            ][i]!;
            return (
              <div key={b.img} style={{ position: "absolute", left: slots.x, bottom: 100 - (slots.y ?? 0), zIndex: slots.z, transform: `translateY(${(1 - s) * 260 + Math.sin((frame + i * 17) / 22) * 6}px) scale(${s})`, transformOrigin: "50% 100%", opacity: Math.min(1, s * 2) }}>
                <Img src={staticFile(b.img)} style={{ height: slots.h, filter: "drop-shadow(0 30px 30px rgba(10,45,93,0.25))" }} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ───────── 6. CTA ───────── */
export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const at = L(CUT.cta);
  const flash = tw(frame, [0, 12], [0.9, 0]);
  const logo = pop(frame, 2, 30, 130, 13);
  const settle = tw(frame, [at(EV.tagline) - 6, at(EV.tagline) + 14], [0, 1], quintInOut);
  const tag = tw(frame, [at(EV.tagline), at(EV.tagline) + 16], [0, 1]);
  const sub = pop(frame, at(EV.subTagline), 30, 200, 14);
  const btn = pop(frame, at(EV.button), 30, 220, 13);
  const clickT = frame - at(EV.buttonClick);
  const press = clickT >= 0 && clickT < 10 ? 1 - Math.sin((clickT / 10) * Math.PI) * 0.07 : 1;
  const shimmer = ((frame - at(EV.button)) % 45) / 45;
  const contacts = pop(frame, at(EV.contacts), 30, 200, 14);
  const cursorP = tw(frame, [at(EV.button) + 6, at(EV.buttonClick)], [0, 1]);

  return (
    <AbsoluteFill>
      <BrandBackground variant="bright" drift={1400} />
      <FallingDrops count={24} seed="cta" speed={12} />
      <Ripples at={0} cx={960} cy={420} rings={4} max={1100} />
      <SplashBurst at={0} cx={960} cy={430} scale={1.4} count={30} seed="cta" />

      <AbsoluteFill style={{ alignItems: "center" }}>
        {/* logo card */}
        <div
          style={{
            marginTop: interpolate(settle, [0, 1], [190, 70]),
            transform: `scale(${(0.6 + 0.4 * logo) * interpolate(settle, [0, 1], [1.15, 0.86])})`,
            opacity: Math.min(1, logo * 1.5),
            ...glassLight,
            background: "rgba(255,255,255,0.94)",
            borderRadius: 48,
            padding: "34px 64px 30px",
          }}
        >
          <Img src={staticFile("img/logo-full.png")} style={{ height: 380, display: "block" }} />
        </div>

        <div style={{ marginTop: 26, fontFamily, fontWeight: 800, fontSize: 64, color: "#fff", letterSpacing: -2, opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`, textShadow: "0 10px 30px rgba(4,20,48,0.35)" }}>
          AquaNest — Pure Water. <span style={{ color: "#BFF3FF" }}>Happy Home.</span>
        </div>
        <div style={{ marginTop: 8, fontFamily, fontWeight: 700, fontSize: 40, color: "rgba(255,255,255,0.92)", transform: `scale(${0.8 + 0.2 * sub})`, opacity: Math.min(1, sub * 1.5) }}>
          Palakihin ang <span style={{ color: "#FFE58A" }}>Tubig Negosyo</span> Mo! 🚀
        </div>

        {/* CTA button */}
        <div style={{ position: "relative", marginTop: 34, transform: `scale(${(0.6 + 0.4 * btn) * press})`, opacity: Math.min(1, btn * 1.6) }}>
          <div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 18, padding: "24px 52px", borderRadius: 999, background: "#fff", color: C.ocean, fontFamily, fontWeight: 800, fontSize: 40, boxShadow: "0 24px 60px rgba(4,20,48,0.35), 0 0 0 8px rgba(255,255,255,0.18)" }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, background: "linear-gradient(135deg,#00B2E3,#0C6DB5)", display: "grid", placeItems: "center" }}>
              <MsgIcon size={30} color="#fff" />
            </span>
            Mag-Message Na — Free Demo!
            <div style={{ position: "absolute", top: 0, bottom: 0, width: 140, left: `${-20 + shimmer * 140}%`, background: "linear-gradient(100deg, transparent, rgba(0,178,227,0.25), transparent)", transform: "skewX(-20deg)" }} />
          </div>
          {clickT >= 0 && clickT < 24 && <div style={{ position: "absolute", left: "50%", top: "50%", width: clickT * 26, height: clickT * 26, marginLeft: -clickT * 13, marginTop: -clickT * 13, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.8)", opacity: 1 - clickT / 24 }} />}
          {/* cursor */}
          {cursorP > 0 && (
            <svg width="54" height="54" viewBox="0 0 24 24" style={{ position: "absolute", left: interpolate(cursorP, [0, 1], [760, 560]), top: interpolate(cursorP, [0, 1], [160, 60]), filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.3))", opacity: tw(frame, [at(EV.buttonClick) + 14, at(EV.buttonClick) + 24], [1, 0]) }}>
              <path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke={C.navy} strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* contacts */}
        <div style={{ display: "flex", gap: 22, marginTop: 30, transform: `translateY(${(1 - contacts) * 40}px)`, opacity: Math.min(1, contacts * 1.5) }}>
          {[
            { Icon: PhoneIcon, text: "0917 123 4567" },
            { Icon: GlobeIcon, text: "www.aquanest.ph" },
          ].map(({ Icon, text }) => (
            <div key={text} style={{ ...glass, display: "flex", alignItems: "center", gap: 14, padding: "14px 28px", borderRadius: 999, fontFamily, fontWeight: 800, fontSize: 34, color: "#fff" }}>
              <Icon size={30} color="#fff" /> {text}
            </div>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

/** Hero droplet that falls during the last frames before the CTA cut. */
export const DropFall: React.FC = () => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 9], [-160, 380], { easing: (t) => t * t, extrapolateRight: "clamp" });
  const stretch = interpolate(frame, [0, 9], [1, 1.35]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 960 - 3, top: y - 220, width: 6, height: 220, borderRadius: 6, background: "linear-gradient(transparent, rgba(255,255,255,0.8))" }} />
      <Drop size={84} style={{ position: "absolute", left: 960 - 42, top: y, transform: `scaleY(${stretch})`, filter: "drop-shadow(0 10px 20px rgba(4,20,48,0.35))" }} />
    </AbsoluteFill>
  );
};
