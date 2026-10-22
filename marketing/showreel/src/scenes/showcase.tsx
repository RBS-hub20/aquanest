import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C, CUT, EV, f, fontFamily, glass, glassLight, pop, quintInOut, tw } from "../theme";
import { BrandBackground, BrowserFrame, CheckIcon, FloatingDrops, NavIcon, PhoneFrame, Pill, WalletIcon } from "../ui/kit";

const L = (sceneStart: number) => (s: number) => f(s) - sceneStart;

/** Whip-pan in from the right, out to the left, with motion blur. */
const Whip: React.FC<{ len: number; children: React.ReactNode; first?: boolean }> = ({ len, children, first }) => {
  const frame = useCurrentFrame();
  const inP = first ? tw(frame, [0, 12], [0, 1]) : tw(frame, [0, 11], [0, 1], quintInOut);
  const outP = tw(frame, [len - 8, len + 3], [0, 1], quintInOut);
  const x = (1 - inP) * 900 - outP * 900;
  const blur = Math.abs(x) / 900 * 28;
  return <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: `blur(${blur}px)`, opacity: first ? inP : 1 }}>{children}</AbsoluteFill>;
};

const Caption: React.FC<{ tag: string; lines: React.ReactNode[]; sub: React.ReactNode; at?: number; width?: number; style?: React.CSSProperties }> = ({ tag, lines, sub, at = 4, width = 620, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", width, ...style }}>
      <div style={{ opacity: tw(frame, [at, at + 10], [0, 1]), transform: `translateY(${tw(frame, [at, at + 12], [20, 0])}px)` }}>
        <Pill style={{ fontSize: 20, padding: "10px 20px", letterSpacing: 3 }}>{tag}</Pill>
      </div>
      <div style={{ marginTop: 26 }}>
        {lines.map((l, i) => {
          const p = tw(frame, [at + 3 + i * 4, at + 18 + i * 4], [0, 1]);
          return (
            <div key={i} style={{ overflow: "hidden" }}>
              <div style={{ fontFamily, fontWeight: 800, fontSize: 74, lineHeight: 1.06, letterSpacing: -2.4, color: "#fff", transform: `translateY(${(1 - p) * 100}%)` }}>{l}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 26, opacity: tw(frame, [at + 14, at + 26], [0, 1]), transform: `translateY(${tw(frame, [at + 14, at + 26], [16, 0])}px)` }}>{sub}</div>
    </div>
  );
};

const Hi: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ background: "linear-gradient(100deg,#9FF0FF,#00B2E3)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{children}</span>
);

const SubChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: "rgba(255,255,255,0.95)", color: C.navy, fontFamily, fontWeight: 700, fontSize: 26, marginRight: 12, boxShadow: "0 12px 30px rgba(4,20,48,0.25)" }}>{children}</span>
);

const Float: React.FC<{ at: number; x: number; y: number; children: React.ReactNode; from?: "up" | "left" | "right"; bob?: number }> = ({ at, x, y, children, from = "up", bob = 0 }) => {
  const frame = useCurrentFrame();
  const s = pop(frame, at, 30, 200, 14);
  const dx = from === "left" ? (1 - s) * -120 : from === "right" ? (1 - s) * 120 : 0;
  const dy = from === "up" ? (1 - s) * 90 : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${dx}px, ${dy + Math.sin((frame + bob) / 20) * 7}px) scale(${0.7 + 0.3 * s})`, opacity: Math.min(1, s * 1.6), transformOrigin: "50% 50%" }}>{children}</div>
  );
};

/* ───────── Customer ───────── */
export const CustomerShow: React.FC = () => {
  const frame = useCurrentFrame();
  const at = L(CUT.customer);
  const len = CUT.rider - CUT.customer;
  const kb = tw(frame, [0, len], [1.0, 1.12], (t) => t);
  const toggle = tw(frame, [at(EV.customerCards[1]) + 8, at(EV.customerCards[1]) + 18], [0, 1]);
  return (
    <AbsoluteFill>
      <BrandBackground variant="deep" drift={400} />
      <FloatingDrops count={8} seed="cu" opacity={0.5} />
      <Whip len={len} first>
        <Caption
          tag="CUSTOMER APP"
          style={{ left: 110, top: 250 }}
          lines={[<>Customer</>, <>magbu-book in</>, <Hi>10 seconds!</Hi>]}
          sub={
            <div>
              <SubChip>🇵🇭 EN / TL</SubChip>
              <SubChip>₱ pricing</SubChip>
            </div>
          }
        />
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: "absolute", left: 760, top: 150, transform: `rotateY(-13deg) rotateX(4deg)`, transformOrigin: "0% 50%" }}>
            <BrowserFrame src="screens/customer.png" url="aquanest.ph/dashboard" width={1180} zoom={kb} originX="40%" originY="30%" />
          </div>
        </AbsoluteFill>
        {/* floating UI cards */}
        <Float at={at(EV.customerCards[0])} x={640} y={610} from="left">
          <div style={{ ...glassLight, borderRadius: 30, padding: 22, width: 290, display: "flex", gap: 18, alignItems: "center" }}>
            <div style={{ width: 92, height: 130, borderRadius: 20, background: "radial-gradient(ellipse at 50% 35%,#fff,#E3F2FC)", display: "grid", placeItems: "center" }}>
              <Img src={staticFile("img/aquanest-19l-round.webp")} style={{ height: 116 }} />
            </div>
            <div style={{ fontFamily }}>
              <div style={{ display: "inline-block", fontSize: 13, fontWeight: 800, color: "#fff", background: "#22C55E", borderRadius: 8, padding: "3px 8px" }}>Popular</div>
              <div style={{ fontWeight: 800, fontSize: 21, color: C.navy, marginTop: 6 }}>19L Round Refill</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 30, color: C.navy }}>₱30.00</span>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: C.ocean, color: "#fff", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700, transform: `scale(${1 - 0.15 * Math.max(0, Math.sin(Math.max(0, frame - at(EV.customerCards[0]) - 14) / 3)) * (frame - at(EV.customerCards[0]) - 14 < 10 ? 1 : 0)})` }}>+</span>
              </div>
            </div>
          </div>
        </Float>
        <Float at={at(EV.customerCards[1])} x={1330} y={70} from="right" bob={20}>
          <div style={{ ...glassLight, borderRadius: 999, padding: 8, display: "flex", alignItems: "center", gap: 6, position: "relative", fontFamily, fontWeight: 800, fontSize: 24 }}>
            <div style={{ position: "absolute", top: 8, left: 8 + toggle * 84, width: 84, height: 50, borderRadius: 999, background: C.ocean, boxShadow: "0 8px 20px rgba(12,109,181,0.4)" }} />
            <span style={{ position: "relative", width: 84, height: 50, display: "grid", placeItems: "center", color: toggle < 0.5 ? "#fff" : C.navy }}>EN</span>
            <span style={{ position: "relative", width: 84, height: 50, display: "grid", placeItems: "center", color: toggle >= 0.5 ? "#fff" : C.navy }}>TL</span>
            <span style={{ position: "relative", padding: "0 16px 0 10px", color: C.navy, fontSize: 22, width: 170 }}>{toggle < 0.5 ? "Place Order" : "Mag-order ✓"}</span>
          </div>
        </Float>
        <Float at={at(EV.customerCards[2])} x={1330} y={846} from="up" bob={40}>
          <div style={{ ...glassLight, borderRadius: 24, padding: "18px 26px", display: "flex", alignItems: "center", gap: 16, fontFamily }}>
            <span style={{ width: 52, height: 52, borderRadius: 999, background: "#22C55E", display: "grid", placeItems: "center" }}>
              <CheckIcon size={30} color="#fff" progress={tw(frame, [at(EV.customerCards[2]) + 4, at(EV.customerCards[2]) + 14], [0, 1])} />
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 24, color: C.navy }}>Order placed! 💧</div>
              <div style={{ fontWeight: 600, fontSize: 18, color: "#5B7194" }}>2 × 19L · GCash ₱60.00 · in 10s</div>
            </div>
          </div>
        </Float>
      </Whip>
    </AbsoluteFill>
  );
};

/* ───────── Rider ───────── */
export const RiderShow: React.FC = () => {
  const frame = useCurrentFrame();
  const at = L(CUT.rider);
  const len = CUT.admin - CUT.rider;
  const route = tw(frame, [4, len], [0, 1], (t) => t);
  const phoneIn = pop(frame, 2, 30, 120, 15);
  return (
    <AbsoluteFill>
      <BrandBackground variant="deep" drift={700} />
      <Whip len={len}>
        {/* map route card */}
        <div style={{ position: "absolute", left: 1210, top: 170, width: 600, height: 720, borderRadius: 40, ...glass, overflow: "hidden" }}>
          <svg viewBox="0 0 600 720" width="600" height="720">
            {Array.from({ length: 12 }).map((_, i) => (
              <path key={i} d={`M0 ${i * 64} L600 ${i * 64 + 40}`} stroke="rgba(255,255,255,0.12)" strokeWidth={i % 3 ? 3 : 10} />
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <path key={`v${i}`} d={`M${i * 75} 0 L${i * 75 - 60} 720`} stroke="rgba(255,255,255,0.1)" strokeWidth={i % 3 ? 3 : 9} />
            ))}
            <path id="rt" d="M90 640 C 160 520, 120 420, 260 380 S 440 300, 470 120" stroke="#9FF0FF" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="1" pathLength={1} strokeDashoffset={1 - route} />
            <circle cx="470" cy="120" r={18 + Math.sin(frame / 4) * 3} fill="#fff" />
            <circle cx="470" cy="120" r="10" fill={C.ocean} />
          </svg>
          <div style={{ position: "absolute", left: 24, top: 24, fontFamily, fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: 2 }}>LIVE · ETA 8 MIN</div>
        </div>
        <AbsoluteFill style={{ perspective: 2000 }}>
          <div style={{ position: "absolute", left: 830, top: 110, transform: `translateY(${(1 - phoneIn) * 300}px) rotateY(${-16 + phoneIn * 8}deg) rotateZ(${(1 - phoneIn) * 6}deg)` }}>
            <PhoneFrame src="screens/rider.png" height={880} />
          </div>
        </AbsoluteFill>
        <Caption tag="RIDER APP" style={{ left: 110, top: 290 }} at={3} width={660} lines={[<>Rider may</>, <Hi>Navigate</Hi>, <>+ COD collect!</>]} sub={<SubChip>🛵 Ingat sa biyahe, Ivan!</SubChip>} />
        <Float at={at(EV.riderCards[0])} x={650} y={700} from="left">
          <div style={{ ...glassLight, borderRadius: 999, padding: "16px 28px", display: "flex", alignItems: "center", gap: 12, fontFamily, fontWeight: 800, fontSize: 26, color: C.ocean }}>
            <NavIcon size={28} color={C.ocean} /> Navigate
            <span style={{ fontSize: 18, color: "#5B7194", fontWeight: 600 }}>· Google Maps</span>
          </div>
        </Float>
        <Float at={at(EV.riderCards[1])} x={1310} y={800} from="right" bob={10}>
          <div style={{ ...glassLight, borderRadius: 26, padding: "18px 26px", display: "flex", alignItems: "center", gap: 16, fontFamily }}>
            <span style={{ width: 54, height: 54, borderRadius: 16, background: "#22C55E", display: "grid", placeItems: "center" }}>
              <WalletIcon size={30} color="#fff" />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, color: "#5B7194" }}>COD collected ✓</div>
              <div style={{ fontWeight: 800, fontSize: 34, color: C.navy }}>₱370.00</div>
            </div>
          </div>
        </Float>
      </Whip>
    </AbsoluteFill>
  );
};

/* ───────── Admin ───────── */
export const AdminShow: React.FC = () => {
  const frame = useCurrentFrame();
  const at = L(CUT.admin);
  const len = CUT.benefits - CUT.admin;
  const zoom = tw(frame, [6, len], [1.0, 1.32], (t) => 1 - Math.pow(1 - t, 2));
  const c0 = at(EV.adminCards[0]);
  const c1 = at(EV.adminCountEnd);
  const amount = Math.round(tw(frame, [c0 + 2, c1], [0, 325], (t) => 1 - Math.pow(1 - t, 3)) * 100) / 100;
  const burst = tw(frame, [c1, c1 + 14], [0, 1]);
  const spark = tw(frame, [c0 + 4, c1 + 6], [0, 1]);
  return (
    <AbsoluteFill>
      <BrandBackground variant="deep" drift={1000} />
      <Whip len={len}>
        <AbsoluteFill style={{ perspective: 2600 }}>
          <div style={{ position: "absolute", left: 700, top: 160, transform: "rotateY(-11deg) rotateX(3deg)", transformOrigin: "0% 50%" }}>
            <BrowserFrame src="screens/admin.png" url="aquanest.ph/admin" width={1220} zoom={zoom} originX="32%" originY="20%" />
          </div>
        </AbsoluteFill>
        <Caption tag="ADMIN DASHBOARD" style={{ left: 110, top: 230 }} at={3} lines={[<>Kita mo lahat</>, <Hi>real-time!</Hi>]} sub={<div><SubChip>💰 ₱325 sales</SubChip><SubChip>🫙 80 gallons out</SubChip></div>} />
        {/* sales counter */}
        <Float at={c0} x={110} y={690} from="left">
          <div style={{ ...glassLight, borderRadius: 32, padding: "26px 32px", width: 470, fontFamily, transform: `scale(${1 + Math.sin(burst * Math.PI) * 0.06})` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2.5, color: "#5B7194" }}>TODAY&apos;S SALES</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#16A34A", background: "#DCFCE7", padding: "4px 10px", borderRadius: 999 }}>● LIVE</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 76, color: C.navy, letterSpacing: -2, marginTop: 4 }}>₱{amount.toFixed(2)}</div>
            <svg viewBox="0 0 400 70" width="406" height="70">
              <path d="M0 55 C 40 50, 60 20, 100 30 S 160 60, 200 40 S 270 10, 300 22 S 360 8, 400 4" fill="none" stroke={C.ocean} strokeWidth="5" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - spark} />
            </svg>
            {burst > 0 && burst < 1 && (
              <div style={{ position: "absolute", right: 24, top: -26, fontWeight: 800, fontSize: 30, color: "#16A34A", opacity: 1 - burst, transform: `translateY(${-burst * 40}px)` }}>ka-ching! 💸</div>
            )}
          </div>
        </Float>
        <Float at={at(EV.adminCards[1])} x={1530} y={810} from="right">
          <div style={{ ...glassLight, borderRadius: 28, padding: "18px 26px", display: "flex", alignItems: "center", gap: 18, fontFamily }}>
            <Img src={staticFile("img/aquanest-19l-round.webp")} style={{ height: 82 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 2, color: "#5B7194" }}>GALLONS OUT</div>
              <div style={{ fontWeight: 800, fontSize: 48, color: C.navy, lineHeight: 1 }}>80</div>
            </div>
          </div>
        </Float>
      </Whip>
    </AbsoluteFill>
  );
};
